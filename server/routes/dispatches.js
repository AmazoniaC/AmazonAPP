import { Router } from 'express'
import { pool }   from '../db.js'

const router = Router()

const toRow = (row) => ({
  id:              row.id,
  dispatchNumber:  row.dispatch_number,
  saleOrderId:     row.sale_order_id    ?? '',
  saleOrderNumber: row.sale_order_number ?? '',
  customer:        row.customer         ?? '',
  customerId:      row.customer_id      ?? '',
  address:         row.address          ?? '',
  scheduledDate:   row.scheduled_date   ? String(row.scheduled_date).split('T')[0] : '',
  scheduledTime:   row.scheduled_time   ?? '',
  driver:          row.driver           ?? '',
  vehiclePlate:    row.vehicle_plate    ?? '',
  status:          row.status           ?? 'scheduled',
  deliveredAt:     row.delivered_at     ? String(row.delivered_at).split('T')[0] : undefined,
  deliveryNotes:   row.delivery_notes   ?? '',
  deliveryAttempts: row.delivery_attempts ?? [],
  items:           row.items            ?? [],
  total:           parseFloat(row.total ?? 0),
  date:            row.date             ? String(row.date).split('T')[0] : '',
})

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM dispatches ORDER BY scheduled_date DESC, created_at DESC'
    )
    res.json(rows.map(toRow))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const {
    id, dispatchNumber, saleOrderId, saleOrderNumber, customer, customerId,
    address, scheduledDate, scheduledTime, driver, vehiclePlate,
    status, deliveredAt, deliveryNotes, deliveryAttempts, items, total, date,
  } = req.body
  try {
    await pool.query(
      `INSERT INTO dispatches
        (id, dispatch_number, sale_order_id, sale_order_number, customer, customer_id,
         address, scheduled_date, scheduled_time, driver, vehicle_plate,
         status, delivered_at, delivery_notes, delivery_attempts, items, total, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        id, dispatchNumber, saleOrderId, saleOrderNumber, customer, customerId ?? '',
        address ?? '', scheduledDate, scheduledTime ?? '', driver, vehiclePlate ?? '',
        status ?? 'scheduled', deliveredAt ?? null, deliveryNotes ?? '',
        JSON.stringify(deliveryAttempts ?? []),
        JSON.stringify(items ?? []), total ?? 0, date,
      ]
    )
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  const {
    dispatchNumber, saleOrderId, saleOrderNumber, customer, customerId,
    address, scheduledDate, scheduledTime, driver, vehiclePlate,
    status, deliveredAt, deliveryNotes, deliveryAttempts, items, total, date,
  } = req.body
  try {
    await pool.query(
      `UPDATE dispatches
       SET dispatch_number=$1, sale_order_id=$2, sale_order_number=$3, customer=$4, customer_id=$5,
           address=$6, scheduled_date=$7, scheduled_time=$8, driver=$9, vehicle_plate=$10,
           status=$11, delivered_at=$12, delivery_notes=$13, delivery_attempts=$14,
           items=$15, total=$16, date=$17
       WHERE id=$18`,
      [
        dispatchNumber, saleOrderId, saleOrderNumber, customer, customerId ?? '',
        address ?? '', scheduledDate, scheduledTime ?? '', driver, vehiclePlate ?? '',
        status, deliveredAt ?? null, deliveryNotes ?? '',
        JSON.stringify(deliveryAttempts ?? []),
        JSON.stringify(items ?? []), total ?? 0, date, req.params.id,
      ]
    )
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM dispatches WHERE id=$1', [req.params.id])
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
