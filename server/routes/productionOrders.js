import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createProductionOrderSchema, updateProductionOrderStatusSchema } from '../schemas/productionOrders.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, order_number AS "orderNumber", recipe, recipe_id AS "recipeId",
              product, planned_qty::float AS "plannedQty", actual_qty::float AS "actualQty",
              rejected_qty::float AS "rejectedQty", status, priority,
              planned_start AS "plannedStart", planned_end AS "plannedEnd",
              estimated_cost::float AS "estimatedCost", actual_cost::float AS "actualCost",
              assigned_to AS "assignedTo", finished_at AS "finishedAt",
              actual_ingredients AS "actualIngredients", notes
       FROM production_orders ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', validate(createProductionOrderSchema), async (req, res) => {
  const {
    id, orderNumber, recipe, recipeId, product, plannedQty,
    status, priority, plannedStart, plannedEnd, estimatedCost, assignedTo, notes,
  } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO production_orders
         (id, order_number, recipe, recipe_id, product, planned_qty,
          status, priority, planned_start, planned_end, estimated_cost, assigned_to, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        id, orderNumber, recipe, recipeId ?? null, product, plannedQty,
        status ?? 'pending', priority ?? 3, plannedStart ?? null, plannedEnd ?? null,
        estimatedCost ?? 0, assignedTo ?? '', notes ?? '',
      ]
    )
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Orden de producción', entityId: id, entityName: product })
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
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Orden de producción', entityId: req.params.id, entityName: rows[0].product, details: `estado → ${status}` })
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
      entityId: req.params.id, entityName: rows[0].product,
      details: `finalizada · producidas ${actualQty}, rechazadas ${rejectedQty}, costo real ${actualCost}`,
    })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM production_orders WHERE id=$1 RETURNING product', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Orden de producción', entityId: req.params.id, entityName: rows[0].product })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
