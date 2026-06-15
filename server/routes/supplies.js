import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createSupplySchema, updateSupplySchema } from '../schemas/supplies.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, COALESCE(sku, id) AS sku, name, category, stock::float, min_stock::float AS "minStock", unit, cost::float, supplier, last_update AS "lastUpdate" FROM supplies ORDER BY name'
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', validate(createSupplySchema), async (req, res) => {
  const { id, sku, name, category, stock, minStock, unit, cost, supplier, lastUpdate } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO supplies (id, sku, name, category, stock, min_stock, unit, cost, supplier, last_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *, COALESCE(sku, id) AS sku`,
      [id, sku ?? id, name, category, stock, minStock, unit, cost, supplier, lastUpdate]
    )
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Insumo', entityId: id, entityName: name })
    res.status(201).json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', validate(updateSupplySchema), async (req, res) => {
  const { sku, name, category, stock, minStock, unit, cost, supplier, lastUpdate } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE supplies SET sku=$1, name=$2, category=$3, stock=$4, min_stock=$5, unit=$6, cost=$7, supplier=$8, last_update=$9
       WHERE id=$10 RETURNING *, COALESCE(sku, id) AS sku`,
      [sku, name, category, stock, minStock, unit, cost, supplier, lastUpdate, req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Insumo', entityId: req.params.id, entityName: name })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM supplies WHERE id=$1 RETURNING name', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Insumo', entityId: req.params.id, entityName: rows[0].name })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
