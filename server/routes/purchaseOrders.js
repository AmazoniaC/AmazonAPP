import { Router } from 'express'
import { pool }   from '../db.js'
import { log, getUser } from '../audit.js'
import { applyStockDelta } from '../inventory.js'

const router = Router()

const toRow = (row) => ({
  id:           row.id,
  orderNumber:  row.order_number,
  supplier:     row.supplier,
  status:       row.status,
  date:         row.date ? String(row.date).split('T')[0] : null,
  expectedDate: row.expected_date ? String(row.expected_date).split('T')[0] : undefined,
  receivedDate: row.received_date ? String(row.received_date).split('T')[0] : undefined,
  items:        row.items ?? [],
  subtotal:     parseFloat(row.subtotal ?? 0),
  total:        parseFloat(row.total    ?? 0),
  notes:        row.notes ?? '',
})

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM purchase_orders ORDER BY date DESC, created_at DESC'
    )
    res.json(rows.map(toRow))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const { id, orderNumber, supplier, status, date, expectedDate, receivedDate, items, subtotal, total, notes } = req.body
  try {
    await pool.query(
      `INSERT INTO purchase_orders (id, order_number, supplier, status, date, expected_date, received_date, items, subtotal, total, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, orderNumber, supplier, status ?? 'draft', date, expectedDate ?? null, receivedDate ?? null,
       JSON.stringify(items ?? []), subtotal ?? 0, total ?? 0, notes ?? '']
    )
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  const { orderNumber, supplier, status, date, expectedDate, receivedDate, items, subtotal, total, notes } = req.body
  try {
    await pool.query(
      `UPDATE purchase_orders
       SET order_number=$1, supplier=$2, status=$3, date=$4, expected_date=$5, received_date=$6,
           items=$7, subtotal=$8, total=$9, notes=$10
       WHERE id=$11`,
      [orderNumber, supplier, status, date, expectedDate ?? null, receivedDate ?? null,
       JSON.stringify(items ?? []), subtotal ?? 0, total ?? 0, notes ?? '', req.params.id]
    )
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Receive goods against a PO: merges received quantities into the items,
// recomputes status (partial/received), and — unlike the old client-side
// loop this replaces — atomically credits each supply's stock AND logs an
// inventory movement for it in the same transaction, so a failure partway
// through never leaves stock updated with no record of why.
router.put('/:id/receive', async (req, res) => {
  const { receivedQtyMap } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE', [req.params.id])
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Not found' })
    }
    const order = rows[0]
    const items = order.items ?? []
    const updatedItems = items.map((item) => ({
      ...item,
      receivedQty: (item.receivedQty ?? 0) + (receivedQtyMap?.[item.supplyId] ?? 0),
    }))
    const allReceived = updatedItems.every((i) => (i.receivedQty ?? 0) >= i.qty)
    const anyReceived = updatedItems.some((i) => (i.receivedQty ?? 0) > 0)
    const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : order.status
    const receivedDate = newStatus === 'received' ? new Date().toISOString().split('T')[0] : order.received_date

    await client.query(
      `UPDATE purchase_orders SET items=$1, status=$2, received_date=$3 WHERE id=$4`,
      [JSON.stringify(updatedItems), newStatus, receivedDate, req.params.id]
    )

    const u = getUser(req)
    let seq = 0
    for (const [supplyId, qty] of Object.entries(receivedQtyMap ?? {})) {
      if (!qty) continue
      await applyStockDelta(client, {
        id: `im_${req.params.id}_${supplyId}_${Date.now()}_${seq++}`,
        itemId: supplyId,
        itemType: 'supply',
        delta: qty,
        movementType: 'entry',
        reference: order.order_number,
        notes: `Recepción OC ${order.order_number} — ${order.supplier}`,
        createdBy: u.name,
      })
    }

    await client.query('COMMIT')
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Orden de compra', entityId: req.params.id, entityName: order.order_number, details: `recepción → ${newStatus}` })
    const { rows: fresh } = await pool.query('SELECT * FROM purchase_orders WHERE id=$1', [req.params.id])
    res.json(toRow(fresh[0]))
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM purchase_orders WHERE id=$1', [req.params.id])
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
