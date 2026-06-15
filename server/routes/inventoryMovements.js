import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createInventoryMovementSchema } from '../schemas/inventoryMovements.js'

const router = Router()

// GET all movements (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { type, item_type, item_id, from, to, limit: lim } = req.query
    let sql = `SELECT id, item_id, item_name, item_type, movement_type, quantity::float, previous_stock::float, new_stock::float, unit, reference, notes, created_by, created_at FROM inventory_movements WHERE 1=1`
    const params = []
    let idx = 1

    if (type) { sql += ` AND movement_type = $${idx++}`; params.push(type) }
    if (item_type) { sql += ` AND item_type = $${idx++}`; params.push(item_type) }
    if (item_id) { sql += ` AND item_id = $${idx++}`; params.push(item_id) }
    if (from) { sql += ` AND created_at >= $${idx++}`; params.push(from) }
    if (to) { sql += ` AND created_at <= $${idx++}::date + interval '1 day'`; params.push(to) }

    sql += ` ORDER BY created_at DESC`
    if (lim) { sql += ` LIMIT $${idx++}`; params.push(parseInt(lim)) }

    const { rows } = await pool.query(sql, params)
    res.json(rows.map(r => ({
      id: r.id,
      itemId: r.item_id,
      itemName: r.item_name,
      itemType: r.item_type,
      movementType: r.movement_type,
      quantity: r.quantity,
      previousStock: r.previous_stock,
      newStock: r.new_stock,
      unit: r.unit,
      reference: r.reference,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })))
  } catch (err) {
    console.error('GET /inventory-movements', err)
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// POST create movement
router.post('/', validate(createInventoryMovementSchema), async (req, res) => {
  try {
    const { id, itemId, itemName, itemType, movementType, quantity, previousStock, newStock, unit, reference, notes } = req.body
    const user = getUser(req)
    await pool.query(
      `INSERT INTO inventory_movements (id, item_id, item_name, item_type, movement_type, quantity, previous_stock, new_stock, unit, reference, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, itemId, itemName, itemType, movementType, quantity, previousStock, newStock, unit, reference || '', notes || '', user]
    )
    log(req, 'create', 'inventory_movement', id, { itemName, movementType, quantity })
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('POST /inventory-movements', err)
    res.status(500).json({ error: 'Error al registrar movimiento' })
  }
})

export default router
