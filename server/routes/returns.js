import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { applyStockDelta } from '../inventory.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, return_number AS "returnNumber",
              sale_order_id AS "saleOrderId", sale_order_number AS "saleOrderNumber",
              customer, customer_id AS "customerId",
              date, reason, status,
              items,
              subtotal::float, tax::float, total::float,
              credit_note_number AS "creditNoteNumber",
              refund_method AS "refundMethod",
              notes, created_at AS "createdAt",
              restocked_at AS "restockedAt"
       FROM returns ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  const { id, returnNumber, saleOrderId, saleOrderNumber, customer, customerId, date, reason, status, items, subtotal, tax, total, creditNoteNumber, refundMethod, notes } = req.body
  if (!customer) return res.status(400).json({ error: 'customer es requerido' })
  // A return can be created already approved/refunded (the status picker in
  // ReturnModal isn't gated to "pending" on first save), so restocking has
  // to be handled on creation too, not just on a later edit.
  const shouldRestock = ['approved', 'refunded'].includes(status ?? 'pending')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO returns (id, return_number, sale_order_id, sale_order_number, customer, customer_id, date, reason, status, items, subtotal, tax, total, credit_note_number, refund_method, notes, restocked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        id, returnNumber ?? null, saleOrderId ?? '', saleOrderNumber ?? '', customer, customerId ?? '',
        date, reason ?? '', status ?? 'pending', JSON.stringify(items ?? []), subtotal ?? 0, tax ?? 0, total ?? 0,
        creditNoteNumber ?? '', refundMethod ?? '', notes ?? '', shouldRestock ? new Date() : null,
      ]
    )
    const u = getUser(req)
    if (shouldRestock) {
      let seq = 0
      for (const item of (items ?? [])) {
        if (!item.productId || !item.qty) continue
        await applyStockDelta(client, {
          id: `im_${id}_${item.productId}_${Date.now()}_${seq++}`,
          itemId: item.productId,
          itemType: 'product',
          delta: item.qty,
          movementType: 'return',
          reference: returnNumber ?? id,
          notes: `Devolución ${returnNumber ?? id} — ${reason ?? ''}`.trim(),
          createdBy: u.name,
        })
      }
    }
    await client.query('COMMIT')
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Devolución', entityId: id, entityName: `${returnNumber ?? id} — ${customer}` })
    res.status(201).json({ id, restocked: shouldRestock })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

router.put('/:id', async (req, res) => {
  const { returnNumber, saleOrderId, saleOrderNumber, customer, customerId, date, reason, status, items, subtotal, tax, total, creditNoteNumber, refundMethod, notes } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: existingRows } = await client.query(
      'SELECT status, items, reason, restocked_at, return_number FROM returns WHERE id=$1 FOR UPDATE',
      [req.params.id]
    )
    if (existingRows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Not found' })
    }
    const existing = existingRows[0]
    const newStatus = status ?? existing.status
    // Restock once, the first time a return lands on approved/refunded —
    // never on every subsequent edit of an already-restocked return (e.g.
    // just fixing a note), and never on a straight-to-rejected return.
    const shouldRestock = !existing.restocked_at && ['approved', 'refunded'].includes(newStatus)
    const effectiveItems = items ?? existing.items ?? []

    const { rows } = await client.query(
      `UPDATE returns SET
         return_number = COALESCE($1, return_number),
         sale_order_id = COALESCE($2, sale_order_id),
         sale_order_number = COALESCE($3, sale_order_number),
         customer = COALESCE($4, customer),
         customer_id = COALESCE($5, customer_id),
         date = COALESCE($6, date),
         reason = COALESCE($7, reason),
         status = COALESCE($8, status),
         items = COALESCE($9, items),
         subtotal = COALESCE($10, subtotal),
         tax = COALESCE($11, tax),
         total = COALESCE($12, total),
         credit_note_number = COALESCE($13, credit_note_number),
         refund_method = COALESCE($14, refund_method),
         notes = COALESCE($15, notes),
         restocked_at = CASE WHEN $17 THEN NOW() ELSE restocked_at END
       WHERE id=$16
       RETURNING id, customer, restocked_at AS "restockedAt"`,
      [
        returnNumber ?? null, saleOrderId ?? null, saleOrderNumber ?? null, customer ?? null, customerId ?? null,
        date ?? null, reason ?? null, status ?? null, items ? JSON.stringify(items) : null,
        subtotal ?? null, tax ?? null, total ?? null, creditNoteNumber ?? null, refundMethod ?? null, notes ?? null,
        req.params.id, shouldRestock,
      ]
    )

    const u = getUser(req)
    if (shouldRestock) {
      let seq = 0
      const effectiveReason = reason ?? existing.reason ?? ''
      for (const item of effectiveItems) {
        if (!item.productId || !item.qty) continue
        await applyStockDelta(client, {
          id: `im_${req.params.id}_${item.productId}_${Date.now()}_${seq++}`,
          itemId: item.productId,
          itemType: 'product',
          delta: item.qty,
          movementType: 'return',
          reference: existing.return_number,
          notes: `Devolución ${existing.return_number} — ${effectiveReason}`.trim(),
          createdBy: u.name,
        })
      }
    }

    await client.query('COMMIT')
    const detail = [status && `estado → ${status}`, refundMethod && `método → ${refundMethod}`, shouldRestock && 'stock reintegrado'].filter(Boolean).join(', ')
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Devolución', entityId: req.params.id, entityName: rows[0].customer, details: detail || null })
    res.json(rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM returns WHERE id=$1 RETURNING customer', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Devolución', entityId: req.params.id, entityName: rows[0].customer })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
