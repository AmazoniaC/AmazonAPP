import { Router } from 'express'
import { pool } from '../db.js'
import { validate } from '../middleware/validate.js'
import { createCalendarItemSchema, updateCalendarItemSchema } from '../schemas/calendarItems.js'

const router = Router()

const toRow = (r) => ({
  id:              r.id,
  kind:            r.kind ?? 'meeting',
  title:           r.title ?? '',
  description:     r.description ?? '',
  location:        r.location ?? '',
  date:            r.date ? String(r.date).split('T')[0] : '',
  time:            r.time ?? '',
  reminderMinutes: r.reminder_minutes ?? 15,
  notifyApp:       r.notify_app ?? true,
  notifyWhatsapp:  r.notify_whatsapp ?? false,
  whatsappPhone:   r.whatsapp_phone ?? '',
  notifiedAt:      r.notified_at ? new Date(r.notified_at).toISOString() : null,
  done:            r.done ?? false,
})

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM calendar_items ORDER BY date ASC, time ASC')
    res.json(rows.map(toRow))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(createCalendarItemSchema), async (req, res) => {
  const b = req.body
  try {
    await pool.query(
      `INSERT INTO calendar_items
        (id, kind, title, description, location, date, time, reminder_minutes,
         notify_app, notify_whatsapp, whatsapp_phone, done)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        b.id, b.kind ?? 'meeting', b.title ?? '', b.description ?? '',
        b.location ?? '', b.date, b.time ?? '', b.reminderMinutes ?? 15,
        b.notifyApp ?? true, b.notifyWhatsapp ?? false,
        b.whatsappPhone ?? '', b.done ?? false,
      ]
    )
    res.status(201).json({ id: b.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(updateCalendarItemSchema), async (req, res) => {
  const b = req.body
  try {
    await pool.query(
      `UPDATE calendar_items SET
        kind=$1, title=$2, description=$3, location=$4, date=$5, time=$6,
        reminder_minutes=$7, notify_app=$8, notify_whatsapp=$9,
        whatsapp_phone=$10, done=$11
       WHERE id=$12`,
      [
        b.kind ?? 'meeting', b.title ?? '', b.description ?? '',
        b.location ?? '', b.date, b.time ?? '', b.reminderMinutes ?? 15,
        b.notifyApp ?? true, b.notifyWhatsapp ?? false,
        b.whatsappPhone ?? '', b.done ?? false, req.params.id,
      ]
    )
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM calendar_items WHERE id=$1', [req.params.id])
    res.json({ id: req.params.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
