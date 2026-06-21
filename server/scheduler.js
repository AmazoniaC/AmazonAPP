// ─────────────────────────────────────────────────────────────────────────────
// Reminder scheduler — runs every 60s, finds calendar items whose reminder
// time has arrived and sends WhatsApp messages via Baileys. The in-app
// notification side is still handled client-side, this only takes care of
// the automatic WhatsApp delivery so it works even if no browser is open.
// ─────────────────────────────────────────────────────────────────────────────
import { pool } from './db.js'
import { sendWhatsAppMessage, getWhatsAppStatus } from './whatsapp.js'

const TICK_MS = 60 * 1000
// Do not send WhatsApp reminders for events older than 24h (likely stale)
const MAX_STALE_MS = 24 * 60 * 60 * 1000

// Cache the user-configured timezone so we parse event times correctly.
// Refreshed once per tick so changes in settings are picked up quickly.
let cachedTimezone = null

async function loadTimezone() {
  try {
    const { rows } = await pool.query(
      `SELECT timezone FROM settings ORDER BY id LIMIT 1`
    )
    cachedTimezone = rows[0]?.timezone || null
  } catch {
    // settings table may not exist yet — fall back to server local time
    cachedTimezone = null
  }
}

function parseEventTime(dateStr, timeStr) {
  if (cachedTimezone) {
    // Build a formatter that renders in the user's timezone so we can derive
    // the correct UTC instant for the local wall-clock time stored in the DB.
    const dt = new Date(`${dateStr}T${timeStr}:00`)
    // Use Intl to figure out the offset at this date in the target timezone,
    // then build an unambiguous ISO string.
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: cachedTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    // The stored date/time IS in the user's timezone. We need the UTC ms.
    // Strategy: create a Date that treats the string as UTC, then adjust by
    // the difference between UTC and the target timezone at that instant.
    const utcGuess = new Date(`${dateStr}T${timeStr}:00Z`)
    const parts = formatter.formatToParts(utcGuess)
    const p = (type) => (parts.find(x => x.type === type)?.value ?? '')
    const rendered = `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}:${p('second')}Z`
    const renderedMs = new Date(rendered).getTime()
    // offsetMs = how far ahead the target TZ is from UTC at this instant
    const offsetMs = renderedMs - utcGuess.getTime()
    // The event is at dateStr/timeStr in the target TZ, so its UTC instant is:
    return new Date(`${dateStr}T${timeStr}:00Z`).getTime() - offsetMs
  }
  // Fallback: server-local time (original behaviour)
  return new Date(`${dateStr}T${timeStr}:00`).getTime()
}

// Throttle "WhatsApp not connected" warnings so we don't spam logs every minute
let lastNotConnectedWarn = 0
const NOT_CONNECTED_WARN_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

function buildMessage(item) {
  const label = item.kind === 'meeting' ? '📅 Reunión' : '🔔 Recordatorio'
  const when = item.time ? ` a las ${item.time}` : ''
  const lines = [`${label}: ${item.title}${when} (${item.date})`]
  if (item.description) lines.push(item.description)
  if (item.location) lines.push(`📍 ${item.location}`)
  return lines.join('\n')
}

async function tick() {
  await loadTimezone()
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

  if (due.length === 0) return

  // Check WhatsApp status AFTER we know there's work to do — this way the user
  // gets a clear log explaining why pending reminders are not being delivered.
  const wa = getWhatsAppStatus()
  if (wa.status !== 'connected') {
    const now = Date.now()
    if (now - lastNotConnectedWarn > NOT_CONNECTED_WARN_INTERVAL_MS) {
      lastNotConnectedWarn = now
      console.warn(
        `⚠️  scheduler: ${due.length} recordatorio(s) pendiente(s) pero WhatsApp está "${wa.status}". ` +
        `Conecta WhatsApp en Configuración → WhatsApp para enviarlos.` +
        (wa.error ? ` Último error: ${wa.error}` : '')
      )
    }
    return
  }

  const now = Date.now()
  for (const r of due) {
    const dateStr = String(r.date).split('T')[0]
    const timeStr = r.time && /^\d{2}:\d{2}$/.test(r.time) ? r.time : '09:00'
    const eventMs = parseEventTime(dateStr, timeStr)
    if (Number.isNaN(eventMs)) continue
    const lead = (r.reminder_minutes ?? 15) * 60 * 1000
    if (now < eventMs - lead) continue

    // Skip stale reminders (event is more than MAX_STALE_MS in the past) so we
    // don't suddenly spam users with week-old reminders if WhatsApp was offline.
    if (now > eventMs + MAX_STALE_MS) {
      await pool.query(
        `UPDATE calendar_items SET notified_at = NOW() WHERE id = $1`,
        [r.id]
      ).catch(() => {})
      console.log(`⏭️  scheduler: saltando recordatorio vencido "${r.title}" (${dateStr} ${timeStr})`)
      continue
    }

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
  setInterval(() => {
    tick().catch((e) => console.error('scheduler tick error:', e.message))
  }, TICK_MS)
  // first tick after a short delay so Baileys has time to connect
  setTimeout(() => {
    tick().catch((e) => console.error('scheduler initial tick error:', e.message))
  }, 10_000)
  console.log('⏰ Scheduler de recordatorios iniciado (cada 60s)')
}
