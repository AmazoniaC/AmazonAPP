import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createSaleOrderSchema, updateSaleOrderSchema } from '../schemas/saleOrders.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      `SELECT id, order_number AS "orderNumber",
              customer_id AS "customerId", customer_name AS "customer",
              date, status, payment_status AS "paymentStatus",
              payment_method AS "paymentMethod",
              subtotal::float, discount::float, tax::float, total::float, notes,
              price_list_id AS "priceListId"
       FROM sale_orders ORDER BY created_at DESC`
    )
    const { rows: items } = await pool.query(
      `SELECT order_id AS "orderId", product_id AS "productId",
              product_name AS "product", quantity::float AS "qty",
              unit_price::float AS "price", discount::float, subtotal::float
       FROM sale_order_items`
    )
    const itemsByOrder = items.reduce((acc, item) => {
      if (!acc[item.orderId]) acc[item.orderId] = []
      acc[item.orderId].push(item)
      return acc
    }, {})
    res.json(orders.map((o) => ({ ...o, items: itemsByOrder[o.id] ?? [] })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', validate(createSaleOrderSchema), async (req, res) => {
  const { id, orderNumber, customerId, customer, date, status, paymentStatus, paymentMethod, subtotal, discount, tax, total, notes, items, priceListId } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO sale_orders (id, order_number, customer_id, customer_name, date, status, payment_status, payment_method, subtotal, discount, tax, total, notes, price_list_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, orderNumber ?? null, customerId ?? null, customer, date, status ?? 'pending', paymentStatus ?? 'pending', paymentMethod ?? null, subtotal ?? 0, discount ?? 0, tax ?? 0, total ?? 0, notes ?? null, priceListId ?? null]
    )
    if (items?.length) {
      for (const item of items) {
        await client.query(
          `INSERT INTO sale_order_items (order_id, product_id, product_name, quantity, unit_price, discount, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, item.productId ?? '', item.product ?? item.productName ?? '', item.qty ?? item.quantity ?? 0, item.price ?? item.unitPrice ?? 0, item.discount ?? 0, item.subtotal ?? 0]
        )
      }
    }
    await client.query('COMMIT')
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Venta', entityId: id, entityName: `${orderNumber ?? id} — ${customer}` })
    res.status(201).json({ id })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

router.put('/:id', validate(updateSaleOrderSchema), async (req, res) => {
  const { status, paymentMethod, paymentStatus } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE sale_orders SET
         status = COALESCE($1, status),
         payment_method = COALESCE($2, payment_method),
         payment_status = COALESCE($3, payment_status)
       WHERE id=$4
       RETURNING id, customer_name AS "customer"`,
      [status ?? null, paymentMethod ?? null, paymentStatus ?? null, req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    const detail = [status && `estado → ${status}`, paymentStatus && `pago → ${paymentStatus}`].filter(Boolean).join(', ')
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Venta', entityId: req.params.id, entityName: rows[0].customer, details: detail || null })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    // sale_order_items has ON DELETE CASCADE on order_id, so deleting the
    // parent row removes the children automatically.
    const { rows } = await pool.query(
      'DELETE FROM sale_orders WHERE id=$1 RETURNING customer_name AS "customer"',
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Venta', entityId: req.params.id, entityName: rows[0].customer })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
