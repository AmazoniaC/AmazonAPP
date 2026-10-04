import { Router } from 'express'
import { pool }   from '../db.js'
import { validate } from '../middleware/validate.js'
import { createOpportunitySchema, updateOpportunitySchema } from '../schemas/opportunities.js'

const router = Router()

const toRow = (row) => ({
  id:             row.id,
  title:          row.title          ?? '',
  customerId:     row.customer_id    ?? '',
  customer:       row.customer       ?? '',
  stage:          row.stage          ?? 'lead',
  value:          parseFloat(row.value       ?? 0),
  probability:    parseInt(row.probability   ?? 0, 10),
  expectedClose:  row.expected_close ? String(row.expected_close).split('T')[0] : undefined,
  assignedTo:     row.assigned_to    ?? '',
  quotationId:    row.quotation_id   ?? '',
  notes:          row.notes          ?? '',
  lostReason:     row.lost_reason    ?? '',
  nextActionDate: row.next_action_date ? String(row.next_action_date).split('T')[0] : undefined,
  nextActionNote: row.next_action_note ?? '',
  createdAt:      row.created_at ? String(row.created_at).split('T')[0] : '',
  updatedAt:      row.updated_at ? String(row.updated_at).split('T')[0] : '',
})

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM opportunities ORDER BY created_at DESC')
    res.json(rows.map(toRow))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(createOpportunitySchema), async (req, res) => {
  const { id, title, customerId, customer, stage, value, probability,
          expectedClose, assignedTo, quotationId, notes, lostReason,
          nextActionDate, nextActionNote, createdAt, updatedAt } = req.body
  try {
    await pool.query(
      `INSERT INTO opportunities
        (id, title, customer_id, customer, stage, value, probability,
         expected_close, assigned_to, quotation_id, notes, lost_reason,
         next_action_date, next_action_note, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, title, customerId ?? '', customer ?? '', stage ?? 'lead',
       value ?? 0, probability ?? 50,
       expectedClose ?? null, assignedTo ?? '', quotationId ?? '',
       notes ?? '', lostReason ?? '', nextActionDate ?? null, nextActionNote ?? '',
       createdAt, updatedAt]
    )
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(updateOpportunitySchema), async (req, res) => {
  const { title, customerId, customer, stage, value, probability,
          expectedClose, assignedTo, quotationId, notes, lostReason,
          nextActionDate, nextActionNote, updatedAt } = req.body
  try {
    // next_action_alert_sent_at is left untouched here — the scheduler's
    // periodic "clear resolved" sweep (tickOpsAlerts) already resets it
    // whenever the stored next_action_date is null/future or the stage is
    // won/lost, which also covers rescheduling the date forward from here.
    await pool.query(
      `UPDATE opportunities
       SET title=$1, customer_id=$2, customer=$3, stage=$4, value=$5, probability=$6,
           expected_close=$7, assigned_to=$8, quotation_id=$9, notes=$10, lost_reason=$11,
           next_action_date=$12, next_action_note=$13, updated_at=$14
       WHERE id=$15`,
      [title, customerId ?? '', customer ?? '', stage ?? 'lead',
       value ?? 0, probability ?? 50,
       expectedClose ?? null, assignedTo ?? '', quotationId ?? '',
       notes ?? '', lostReason ?? '', nextActionDate ?? null, nextActionNote ?? '',
       updatedAt, req.params.id]
    )
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM opportunities WHERE id=$1', [req.params.id])
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
