import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createQuotationSchema, updateQuotationSchema } from '../schemas/quotations.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, quote_number AS "quoteNumber", customer, customer_id AS "customerId",
              items, subtotal::float, tax::float, total::float, status,
              valid_until AS "validUntil", date, delivery_estimate AS "deliveryEstimate",
              notes, internal_notes AS "internalNotes", converted_to_order_id AS "convertedToOrderId"
       FROM quotations ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', validate(createQuotationSchema), async (req, res) => {
  const { id, quoteNumber, customer, customerId, items, subtotal, tax, total,
          status, validUntil, date, deliveryEstimate, notes, internalNotes, convertedToOrderId } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO quotations
         (id, quote_number, customer, customer_id, items, subtotal, tax, total,
          status, valid_until, date, delivery_estimate, notes, internal_notes, converted_to_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [id, quoteNumber, customer, customerId ?? '', JSON.stringify(items ?? []),
       subtotal ?? 0, tax ?? 0, total ?? 0, status ?? 'draft',
       validUntil, date ?? new Date().toISOString().split('T')[0],
       deliveryEstimate ?? '', notes ?? '', internalNotes ?? '', convertedToOrderId ?? '']
    )
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Cotización', entityId: id, entityName: quoteNumber })
    res.status(201).json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', validate(updateQuotationSchema), async (req, res) => {
  const { quoteNumber, customer, customerId, items, subtotal, tax, total,
          status, validUntil, date, deliveryEstimate, notes, internalNotes, convertedToOrderId } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE quotations SET
         quote_number=$1, customer=$2, customer_id=$3, items=$4, subtotal=$5, tax=$6, total=$7,
         status=$8, valid_until=$9, date=$10, delivery_estimate=$11, notes=$12,
         internal_notes=$13, converted_to_order_id=$14
       WHERE id=$15 RETURNING id`,
      [quoteNumber, customer, customerId ?? '', JSON.stringify(items ?? []),
       subtotal ?? 0, tax ?? 0, total ?? 0, status ?? 'draft',
       validUntil, date ?? new Date().toISOString().split('T')[0],
       deliveryEstimate ?? '', notes ?? '', internalNotes ?? '', convertedToOrderId ?? '',
       req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Cotización', entityId: req.params.id, entityName: quoteNumber })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM quotations WHERE id=$1 RETURNING quote_number', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Cotización', entityId: req.params.id, entityName: rows[0].quote_number })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
