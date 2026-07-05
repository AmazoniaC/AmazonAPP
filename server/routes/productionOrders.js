import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createProductionOrderSchema, updateProductionOrderStatusSchema } from '../schemas/productionOrders.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, product_id AS "productId", product_name AS "productName",
              quantity::float, unit, status, start_date AS "startDate",
              end_date AS "endDate", notes
       FROM production_orders ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', validate(createProductionOrderSchema), async (req, res) => {
  const { id, productId, productName, quantity, unit, status, startDate, endDate, notes } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO production_orders (id, product_id, product_name, quantity, unit, status, start_date, end_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, productId, productName, quantity, unit, status ?? 'pending', startDate, endDate, notes]
    )
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Orden de producción', entityId: id, entityName: productName })
    res.status(201).json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id/status', validate(updateProductionOrderStatusSchema), async (req, res) => {
  const { status } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE production_orders SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Orden de producción', entityId: req.params.id, entityName: rows[0].product_name, details: `estado → ${status}` })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Finalize a production order with actual data — captures real qty, rejections,
// ingredient consumption and computes the real cost.
router.put('/:id/finish', async (req, res) => {
  const { actualQty, rejectedQty, actualCost, actualIngredients, notes } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE production_orders
       SET status = 'finished',
           actual_qty         = $1,
           rejected_qty       = $2,
           actual_cost        = $3,
           actual_ingredients = $4,
           notes              = $5,
           finished_at        = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        actualQty ?? 0,
        rejectedQty ?? 0,
        actualCost ?? 0,
        JSON.stringify(actualIngredients ?? []),
        notes ?? '',
        req.params.id,
      ]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({
      userName: u.name, userEmail: u.email, action: 'editar', entity: 'Orden de producción',
      entityId: req.params.id, entityName: rows[0].product_name,
      details: `finalizada · producidas ${actualQty}, rechazadas ${rejectedQty}, costo real ${actualCost}`,
    })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM production_orders WHERE id=$1 RETURNING product_name AS "productName"', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Orden de producción', entityId: req.params.id, entityName: rows[0].productName })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
