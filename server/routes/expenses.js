import { Router } from 'express'
import { pool }   from '../db.js'
import { validate } from '../middleware/validate.js'
import { createExpenseSchema, updateExpenseSchema } from '../schemas/expenses.js'

const router = Router()

const toRow = (row) => ({
  id:            row.id,
  date:          row.date ? String(row.date).split('T')[0] : '',
  category:      row.category      ?? 'Otros',
  description:   row.description   ?? '',
  amount:        parseFloat(row.amount ?? 0),
  beneficiary:   row.beneficiary   ?? '',
  paymentMethod: row.payment_method ?? 'Transferencia',
  notes:         row.notes          ?? '',
  recurring:     row.recurring      ?? false,
  period:        row.period         ?? 'once',
})

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC')
    res.json(rows.map(toRow))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(createExpenseSchema), async (req, res) => {
  const { id, date, category, description, amount, beneficiary, paymentMethod, notes, recurring, period } = req.body
  try {
    await pool.query(
      `INSERT INTO expenses (id, date, category, description, amount, beneficiary, payment_method, notes, recurring, period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, date, category ?? 'Otros', description ?? '', amount ?? 0,
       beneficiary ?? '', paymentMethod ?? 'Transferencia', notes ?? '',
       recurring ?? false, period ?? 'once']
    )
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(updateExpenseSchema), async (req, res) => {
  const { date, category, description, amount, beneficiary, paymentMethod, notes, recurring, period } = req.body
  try {
    await pool.query(
      `UPDATE expenses
       SET date=$1, category=$2, description=$3, amount=$4, beneficiary=$5,
           payment_method=$6, notes=$7, recurring=$8, period=$9
       WHERE id=$10`,
      [date, category ?? 'Otros', description ?? '', amount ?? 0,
       beneficiary ?? '', paymentMethod ?? 'Transferencia', notes ?? '',
       recurring ?? false, period ?? 'once', req.params.id]
    )
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id=$1', [req.params.id])
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
