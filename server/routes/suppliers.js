import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

const SELECT_COLS = `
  id, name,
  contact_name AS "contactName",
  email, phone, address, city, category, notes,
  is_active AS "isActive",
  created_at AS "createdAt",
  lead_time_days  AS "leadTimeDays",
  payment_terms   AS "paymentTerms",
  min_order_value::float AS "minOrderValue"`

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM suppliers ORDER BY name`)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  const { id, name, contactName, email, phone, address, city, category, notes, isActive,
          leadTimeDays, paymentTerms, minOrderValue } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers
         (id, name, contact_name, email, phone, address, city, category, notes, is_active,
          lead_time_days, payment_terms, min_order_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING ${SELECT_COLS}`,
      [
        id, name, contactName ?? '', email ?? '', phone ?? '',
        address ?? '', city ?? '', category ?? '', notes ?? '', isActive ?? true,
        leadTimeDays ?? 0, paymentTerms ?? 0, minOrderValue ?? 0,
      ]
    )
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Proveedor', entityId: id, entityName: name })
    res.status(201).json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  const { name, contactName, email, phone, address, city, category, notes, isActive,
          leadTimeDays, paymentTerms, minOrderValue } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE suppliers
       SET name=$1, contact_name=$2, email=$3, phone=$4, address=$5, city=$6,
           category=$7, notes=$8, is_active=$9,
           lead_time_days=$10, payment_terms=$11, min_order_value=$12
       WHERE id=$13
       RETURNING ${SELECT_COLS}`,
      [name, contactName ?? '', email ?? '', phone ?? '', address ?? '', city ?? '',
       category ?? '', notes ?? '', isActive ?? true,
       leadTimeDays ?? 0, paymentTerms ?? 0, minOrderValue ?? 0,
       req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Proveedor', entityId: req.params.id, entityName: name })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM suppliers WHERE id=$1 RETURNING name', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Proveedor', entityId: req.params.id, entityName: rows[0].name })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
