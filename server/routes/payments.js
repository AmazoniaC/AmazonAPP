import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, sale_order_id AS "saleOrderId", sale_order_number AS "saleOrderNumber",
              customer, customer_id AS "customerId",
              date, amount::float, method, reference, notes,
              created_at AS "createdAt"
       FROM payments ORDER BY date DESC, created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  const { id, saleOrderId, saleOrderNumber, customer, customerId, date, amount, method, reference, notes } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto debe ser mayor a 0' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO payments (id, sale_order_id, sale_order_number, customer, customer_id, date, amount, method, reference, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, saleOrderId ?? '', saleOrderNumber ?? '', customer ?? '', customerId ?? '',
       date, amount, method ?? 'Transferencia', reference ?? '', notes ?? '']
    )
    // Update sale order payment status based on total payments
    if (saleOrderId) {
      const { rows: payRows } = await client.query(
        'SELECT COALESCE(SUM(amount), 0)::float AS paid FROM payments WHERE sale_order_id = $1',
        [saleOrderId]
      )
      const { rows: orderRows } = await client.query(
        'SELECT total::float FROM sale_orders WHERE id = $1',
        [saleOrderId]
      )
      if (orderRows.length > 0) {
        const paid = payRows[0]?.paid ?? 0
        const total = orderRows[0]?.total ?? 0
        const newStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending'
        await client.query('UPDATE sale_orders SET payment_status = $1 WHERE id = $2', [newStatus, saleOrderId])
      }
    }
    await client.query('COMMIT')
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Pago', entityId: id, entityName: `${customer} — $${amount}` })
    res.status(201).json({ id })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

router.delete('/:id', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'DELETE FROM payments WHERE id=$1 RETURNING customer, sale_order_id AS "saleOrderId", amount::float',
      [req.params.id]
    )
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Not found' })
    }
    // Recalculate sale order payment status
    const saleOrderId = rows[0].saleOrderId
    if (saleOrderId) {
      const { rows: payRows } = await client.query(
        'SELECT COALESCE(SUM(amount), 0)::float AS paid FROM payments WHERE sale_order_id = $1',
        [saleOrderId]
      )
      const { rows: orderRows } = await client.query(
        'SELECT total::float FROM sale_orders WHERE id = $1',
        [saleOrderId]
      )
      if (orderRows.length > 0) {
        const paid = payRows[0]?.paid ?? 0
        const total = orderRows[0]?.total ?? 0
        const newStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending'
        await client.query('UPDATE sale_orders SET payment_status = $1 WHERE id = $2', [newStatus, saleOrderId])
      }
    }
    await client.query('COMMIT')
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Pago', entityId: req.params.id, entityName: rows[0].customer })
    res.json({ ok: true })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

export default router
