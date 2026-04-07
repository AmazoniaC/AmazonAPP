// ─────────────────────────────────────────────────────────────────────────────
// Reminder scheduler — runs every 60s, finds calendar items whose reminder
// time has arrived and sends WhatsApp messages via Baileys. The in-app
// notification side is still handled client-side, this only takes care of
// the automatic WhatsApp delivery so it works even if no browser is open.
// ─────────────────────────────────────────────────────────────────────────────
import { pool } from './db.js'
import { sendWhatsAppMessage, getWhatsAppStatus } from './whatsapp.js'

const TICK_MS = 60 * 1000

function buildMessage(item) {
  const label = item.kind === 'meeting' ? '📅 Reunión' : '🔔 Recordatorio'
  const when = item.time ? ` a las ${item.time}` : ''
  const lines = [`${label}: ${item.title}${when} (${item.date})`]
  if (item.description) lines.push(item.description)
  if (item.location) lines.push(`📍 ${item.location}`)
  return lines.join('\n')
}

async function tick() {
  const wa = getWhatsAppStatus()
  if (wa.status !== 'connected') return // skip until WhatsApp linked

  let due
  try {
    const { rows } = await pool.query(
      `SELECT * FROM calendar_items
       WHERE done = FALSE
         AND notify_whatsapp = TRUE
         AND notified_at IS NULL
         AND whatsapp_phone <> ''`
    )
    due = rows
  } catch (e) {
    console.error('scheduler: error consultando calendar_items', e.message)
    return
  }

  const now = Date.now()
  for (const r of due) {
    const dateStr = String(r.date).split('T')[0]
    const timeStr = r.time && /^\d{2}:\d{2}$/.test(r.time) ? r.time : '09:00'
    const eventMs = new Date(`${dateStr}T${timeStr}:00`).getTime()
    if (Number.isNaN(eventMs)) continue
    const lead = (r.reminder_minutes ?? 15) * 60 * 1000
    if (now < eventMs - lead) continue

    const item = {
      kind: r.kind, title: r.title, description: r.description,
      location: r.location, date: dateStr, time: r.time,
    }
    try {
      await sendWhatsAppMessage(r.whatsapp_phone, buildMessage(item))
      await pool.query('UPDATE calendar_items SET notified_at = NOW() WHERE id = $1', [r.id])
      console.log(`📤 WhatsApp enviado: ${r.title} → ${r.whatsapp_phone}`)
    } catch (e) {
      console.error(`scheduler: fallo al enviar a ${r.whatsapp_phone}:`, e.message)
    }
  }
}

export function startScheduler() {
  setInterval(() => { tick().catch(() => {}) }, TICK_MS)
  // first tick after a short delay so Baileys has time to connect
  setTimeout(() => { tick().catch(() => {}) }, 10_000)
  console.log('⏰ Scheduler de recordatorios iniciado (cada 60s)')
}
