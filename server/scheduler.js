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
  // Reject empty / malformed inputs early so we never hand an Invalid Date
  // to Intl.formatToParts (which throws "Invalid time value").
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NaN
  }
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
    timeStr = '09:00'
  }

  if (cachedTimezone) {
    try {
      const utcGuess = new Date(`${dateStr}T${timeStr}:00Z`)
      if (Number.isNaN(utcGuess.getTime())) return NaN

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: cachedTimezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
      const parts = formatter.formatToParts(utcGuess)
      const p = (type) => (parts.find(x => x.type === type)?.value ?? '')
      const rendered = `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}:${p('second')}Z`
      const renderedMs = new Date(rendered).getTime()
      if (Number.isNaN(renderedMs)) return NaN
      const offsetMs = renderedMs - utcGuess.getTime()
      return new Date(`${dateStr}T${timeStr}:00Z`).getTime() - offsetMs
    } catch {
      return NaN
    }
  }

  // Fallback: server-local time (original behaviour)
  const ms = new Date(`${dateStr}T${timeStr}:00`).getTime()
  return Number.isNaN(ms) ? NaN : ms
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

/** Add N days to a YYYY-MM-DD string, return YYYY-MM-DD (mirrors Cartera.tsx's addDaysISO) */
function addDaysISO(d, days) {
  const dt = new Date(`${d}T12:00:00`)
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().split('T')[0]
}

function formatCOP(amount) {
  return `$ ${Math.round(amount).toLocaleString('es-CO')}`
}

function buildBankInfo({ bankName, bankAccountType, bankAccountNumber, bankMessage }) {
  if (!bankName && !bankAccountNumber) return ''
  const parts = []
  if (bankName) parts.push(`Banco: ${bankName}`)
  if (bankAccountType) parts.push(`Tipo: ${bankAccountType}`)
  if (bankAccountNumber) parts.push(`Cuenta: ${bankAccountNumber}`)
  if (bankMessage) parts.push(bankMessage)
  return parts.join('\n')
}

function buildCarteraReminderMessage({ companyName, customer, orderNumber, dueDate, remaining, bankInfo }) {
  const lines = [
    `Hola ${(customer || '').split(' ')[0]} 👋`,
    '',
    `Te escribimos de ${companyName} para recordarte que tienes un saldo pendiente:`,
    '',
    `📦 *Orden:* ${orderNumber}`,
    `📅 *Vencimiento:* ${dueDate}`,
    `💰 *Saldo pendiente:* ${formatCOP(remaining)}`,
  ]
  if (bankInfo) lines.push('', bankInfo)
  lines.push('', '¿Ya realizaste el pago? Envíanos el comprobante por este medio. ¡Gracias! 🙏')
  return lines.join('\n')
}

// Throttle the cartera "not connected" warning the same way as calendar reminders
let lastCarteraNotConnectedWarn = 0

// Sends a one-time WhatsApp payment reminder for sale orders whose due date
// (order date + customer payment terms, same formula Cartera.tsx uses to show
// "días de mora") is at least `cartera_reminder_days` days in the past. Marks
// cartera_reminder_sent_at only on a confirmed send, so it's safe to leave
// unmarked when WhatsApp isn't connected — it will simply retry next tick.
async function tickCartera() {
  let settings
  try {
    const { rows } = await pool.query(
      `SELECT cartera_auto_reminders AS "auto", cartera_reminder_days AS "days",
              company_name AS "companyName", bank_name AS "bankName",
              bank_account_type AS "bankAccountType", bank_account_number AS "bankAccountNumber",
              bank_message AS "bankMessage"
       FROM settings WHERE id = 1`
    )
    settings = rows[0]
  } catch {
    return // settings table may not exist yet
  }
  if (!settings || settings.auto === false) return
  const reminderDays = settings.days ?? 3

  let due
  try {
    const { rows } = await pool.query(`
      SELECT so.id, so.order_number, so.customer_name AS customer, so.total, so.date,
             c.phone, c.payment_terms,
             COALESCE((SELECT SUM(amount) FROM payments p WHERE p.sale_order_id = so.id), 0) AS paid_amount
      FROM sale_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE so.payment_status <> 'paid'
        AND so.status <> 'cancelled'
        AND so.cartera_reminder_sent_at IS NULL
        AND c.phone IS NOT NULL AND c.phone <> ''
    `)
    due = rows
  } catch (e) {
    console.error('scheduler: error consultando cartera', e.message)
    return
  }
  if (due.length === 0) return

  const overdue = due
    .map((r) => {
      const remaining = Number(r.total) - Number(r.paid_amount)
      const dueDateStr = addDaysISO(String(r.date).split('T')[0], r.payment_terms ?? 0)
      const daysPastDue = Math.floor((Date.now() - new Date(`${dueDateStr}T12:00:00`).getTime()) / 86400000)
      return { ...r, remaining, dueDateStr, daysPastDue }
    })
    .filter((r) => r.remaining > 0 && r.daysPastDue >= reminderDays)
  if (overdue.length === 0) return

  const wa = getWhatsAppStatus()
  if (wa.status !== 'connected') {
    const now = Date.now()
    if (now - lastCarteraNotConnectedWarn > NOT_CONNECTED_WARN_INTERVAL_MS) {
      lastCarteraNotConnectedWarn = now
      console.warn(
        `⚠️  scheduler: ${overdue.length} recordatorio(s) de cartera pendiente(s) pero WhatsApp está "${wa.status}". ` +
        `Conecta WhatsApp en Configuración → WhatsApp para enviarlos.`
      )
    }
    return
  }

  const bankInfo = buildBankInfo(settings)
  for (const r of overdue) {
    const message = buildCarteraReminderMessage({
      companyName: settings.companyName || 'Nuestra empresa',
      customer: r.customer, orderNumber: r.order_number,
      dueDate: r.dueDateStr, remaining: r.remaining, bankInfo,
    })
    try {
      await sendWhatsAppMessage(r.phone, message)
      await pool.query('UPDATE sale_orders SET cartera_reminder_sent_at = NOW() WHERE id = $1', [r.id])
      console.log(`📤 Recordatorio de cartera enviado: ${r.order_number} → ${r.phone}`)
    } catch (e) {
      console.error(`scheduler: fallo al enviar recordatorio de cartera a ${r.phone}:`, e.message)
    }
  }
}

function buildQuoteFollowUpMessage({ companyName, customer, quoteNumber, daysLeft }) {
  const urgency = daysLeft <= 1
    ? `\n\n⏳ Recuerda que la cotización vence ${daysLeft === 0 ? 'hoy' : 'mañana'}.`
    : `\n\n⏳ Recuerda que la cotización vence en *${daysLeft} días*.`
  return `Hola ${(customer || '').split(' ')[0]} 👋

Te escribo desde *${companyName}* para hacer seguimiento a la cotización *${quoteNumber}*.${urgency}

¿Pudiste revisarla? Cualquier duda o ajuste, con gusto te ayudo. 🌿`
}

// Throttle the quote follow-up "not connected" warning the same way as the others
let lastQuoteNotConnectedWarn = 0

// Sends a one-time WhatsApp nudge for quotations still "sent" (awaiting the
// customer's response) that are within `quote_followup_days` of their
// validUntil date and haven't expired yet. Mirrors tickCartera: marks
// follow_up_sent_at only on a confirmed send, so a disconnected WhatsApp
// just retries on the next tick instead of silently missing the window.
async function tickQuoteFollowUp() {
  let settings
  try {
    const { rows } = await pool.query(
      `SELECT quote_auto_followup AS "auto", quote_followup_days AS "days",
              company_name AS "companyName"
       FROM settings WHERE id = 1`
    )
    settings = rows[0]
  } catch {
    return // settings table may not exist yet
  }
  if (!settings || settings.auto === false) return
  const followupDays = settings.days ?? 2

  let due
  try {
    const { rows } = await pool.query(`
      SELECT q.id, q.quote_number, q.customer, q.valid_until,
             c.phone
      FROM quotations q
      LEFT JOIN customers c ON c.id = q.customer_id
      WHERE q.status = 'sent'
        AND q.follow_up_sent_at IS NULL
        AND q.valid_until IS NOT NULL
        AND c.phone IS NOT NULL AND c.phone <> ''
    `)
    due = rows
  } catch (e) {
    console.error('scheduler: error consultando seguimiento de cotizaciones', e.message)
    return
  }
  if (due.length === 0) return

  const upcoming = due
    .map((r) => {
      const validUntilStr = String(r.valid_until).split('T')[0]
      const daysLeft = Math.ceil((new Date(`${validUntilStr}T12:00:00`).getTime() - Date.now()) / 86400000)
      return { ...r, daysLeft }
    })
    // Only while still pending, not yet expired, and inside the reminder window
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= followupDays)
  if (upcoming.length === 0) return

  const wa = getWhatsAppStatus()
  if (wa.status !== 'connected') {
    const now = Date.now()
    if (now - lastQuoteNotConnectedWarn > NOT_CONNECTED_WARN_INTERVAL_MS) {
      lastQuoteNotConnectedWarn = now
      console.warn(
        `⚠️  scheduler: ${upcoming.length} seguimiento(s) de cotización pendiente(s) pero WhatsApp está "${wa.status}". ` +
        `Conecta WhatsApp en Configuración → WhatsApp para enviarlos.`
      )
    }
    return
  }

  for (const r of upcoming) {
    const message = buildQuoteFollowUpMessage({
      companyName: settings.companyName || 'Nuestra empresa',
      customer: r.customer, quoteNumber: r.quote_number, daysLeft: r.daysLeft,
    })
    try {
      await sendWhatsAppMessage(r.phone, message)
      await pool.query('UPDATE quotations SET follow_up_sent_at = NOW() WHERE id = $1', [r.id])
      console.log(`📤 Seguimiento de cotización enviado: ${r.quote_number} → ${r.phone}`)
    } catch (e) {
      console.error(`scheduler: fallo al enviar seguimiento de cotización a ${r.phone}:`, e.message)
    }
  }
}

// Throttle the ops-alerts "not connected" warning the same way as the others
let lastOpsNotConnectedWarn = 0

// Bridges the same conditions the in-app "smart alerts" bell already detects
// (checkAlerts in src/store/slices/notificationsSlice.ts) out to the
// company's own WhatsApp number, since those alerts otherwise only exist in
// whoever's browser happens to be open. Each category sends at most one
// digest message while its condition holds (tracked via a per-row or
// per-settings "already alerted" timestamp, cleared once resolved so a
// recurrence can alert again), batched into one message per category per
// tick rather than one message per item.
async function tickOpsAlerts() {
  let settings
  try {
    const { rows } = await pool.query(
      `SELECT ops_alerts_enabled AS "enabled", whatsapp,
              ops_alert_low_stock           AS "lowStock",
              ops_alert_po_overdue          AS "poOverdue",
              ops_alert_delivery_overdue    AS "deliveryOverdue",
              ops_alert_production_priority AS "productionPriority",
              ops_alert_quote_expiring      AS "quoteExpiring",
              ops_alert_crm_stale           AS "crmStale"
       FROM settings WHERE id = 1`
    )
    settings = rows[0]
  } catch {
    return // settings table may not exist yet
  }
  if (!settings || settings.enabled === false) return
  const phone = (settings.whatsapp || '').trim()
  if (!phone) return

  // Clear resolved conditions regardless of WhatsApp connectivity, so a
  // condition that comes back later can alert again instead of staying
  // permanently "already sent".
  try {
    await pool.query(`UPDATE supplies SET low_stock_alert_sent_at = NULL WHERE stock > min_stock AND low_stock_alert_sent_at IS NOT NULL`)
    await pool.query(`UPDATE purchase_orders SET overdue_alert_sent_at = NULL WHERE (status NOT IN ('sent','partial') OR expected_date >= CURRENT_DATE) AND overdue_alert_sent_at IS NOT NULL`)
    await pool.query(`UPDATE sale_orders SET delivery_overdue_alert_sent_at = NULL WHERE (status NOT IN ('confirmed','processing') OR delivery_date IS NULL OR delivery_date >= CURRENT_DATE) AND delivery_overdue_alert_sent_at IS NOT NULL`)
    await pool.query(`UPDATE production_orders SET priority_alert_sent_at = NULL WHERE (status <> 'pending' OR priority <> 1) AND priority_alert_sent_at IS NOT NULL`)
    await pool.query(`UPDATE quotations SET expiring_alert_sent_at = NULL WHERE status NOT IN ('draft','sent') AND expiring_alert_sent_at IS NOT NULL`)
  } catch (e) {
    console.error('scheduler: error limpiando alertas operativas resueltas', e.message)
  }

  const categories = []

  if (settings.lowStock) {
    const { rows } = await pool.query(
      `SELECT id, name, stock::float, min_stock::float AS "minStock", unit
       FROM supplies WHERE stock <= min_stock AND low_stock_alert_sent_at IS NULL`
    )
    if (rows.length > 0) categories.push({
      header: '⚠️ *Stock bajo*',
      lines: rows.map((r) => `${r.name}: ${r.stock} ${r.unit} (mín. ${r.minStock})`),
      mark: () => pool.query(`UPDATE supplies SET low_stock_alert_sent_at = NOW() WHERE id = ANY($1)`, [rows.map((r) => r.id)]),
    })
  }

  if (settings.poOverdue) {
    const { rows } = await pool.query(
      `SELECT id, order_number, supplier, expected_date
       FROM purchase_orders
       WHERE status IN ('sent','partial') AND expected_date < CURRENT_DATE AND overdue_alert_sent_at IS NULL`
    )
    if (rows.length > 0) categories.push({
      header: '🚚 *Compras atrasadas*',
      lines: rows.map((r) => `${r.order_number} — ${r.supplier} (esperada ${String(r.expected_date).split('T')[0]})`),
      mark: () => pool.query(`UPDATE purchase_orders SET overdue_alert_sent_at = NOW() WHERE id = ANY($1)`, [rows.map((r) => r.id)]),
    })
  }

  if (settings.deliveryOverdue) {
    const { rows } = await pool.query(
      `SELECT id, order_number, customer_name, delivery_date
       FROM sale_orders
       WHERE status IN ('confirmed','processing') AND delivery_date IS NOT NULL
         AND delivery_date < CURRENT_DATE AND delivery_overdue_alert_sent_at IS NULL`
    )
    if (rows.length > 0) categories.push({
      header: '📦 *Entregas vencidas*',
      lines: rows.map((r) => `${r.order_number} — ${r.customer_name} (debía ${String(r.delivery_date).split('T')[0]})`),
      mark: () => pool.query(`UPDATE sale_orders SET delivery_overdue_alert_sent_at = NOW() WHERE id = ANY($1)`, [rows.map((r) => r.id)]),
    })
  }

  if (settings.productionPriority) {
    const { rows } = await pool.query(
      `SELECT id, order_number, product
       FROM production_orders
       WHERE status = 'pending' AND priority = 1 AND priority_alert_sent_at IS NULL`
    )
    if (rows.length > 0) categories.push({
      header: '🏭 *Producción prioritaria sin iniciar*',
      lines: rows.map((r) => `${r.order_number} — ${r.product}`),
      mark: () => pool.query(`UPDATE production_orders SET priority_alert_sent_at = NOW() WHERE id = ANY($1)`, [rows.map((r) => r.id)]),
    })
  }

  if (settings.quoteExpiring) {
    const { rows } = await pool.query(
      `SELECT id, quote_number, customer, valid_until
       FROM quotations
       WHERE status IN ('draft','sent') AND valid_until >= CURRENT_DATE
         AND valid_until <= CURRENT_DATE + INTERVAL '3 days' AND expiring_alert_sent_at IS NULL`
    )
    if (rows.length > 0) categories.push({
      header: '📋 *Cotizaciones por vencer*',
      lines: rows.map((r) => `${r.quote_number} — ${r.customer} (vence ${String(r.valid_until).split('T')[0]})`),
      mark: () => pool.query(`UPDATE quotations SET expiring_alert_sent_at = NOW() WHERE id = ANY($1)`, [rows.map((r) => r.id)]),
    })
  }

  if (settings.crmStale) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS cnt FROM customer_activities WHERE done = FALSE AND date < CURRENT_DATE - INTERVAL '7 days'`
    )
    const cnt = rows[0]?.cnt ?? 0
    const { rows: s2 } = await pool.query(`SELECT crm_stale_alert_sent_at AS "sentAt" FROM settings WHERE id=1`)
    const alreadySent = !!s2[0]?.sentAt
    if (cnt === 0 && alreadySent) {
      await pool.query(`UPDATE settings SET crm_stale_alert_sent_at = NULL WHERE id=1`)
    } else if (cnt > 0 && !alreadySent) {
      categories.push({
        header: '👥 *Seguimientos CRM pendientes*',
        lines: [`${cnt} seguimiento${cnt > 1 ? 's' : ''} de clientes sin completar desde hace más de 7 días.`],
        mark: () => pool.query(`UPDATE settings SET crm_stale_alert_sent_at = NOW() WHERE id=1`),
      })
    }
  }

  if (categories.length === 0) return

  const wa = getWhatsAppStatus()
  if (wa.status !== 'connected') {
    const now = Date.now()
    if (now - lastOpsNotConnectedWarn > NOT_CONNECTED_WARN_INTERVAL_MS) {
      lastOpsNotConnectedWarn = now
      console.warn(
        `⚠️  scheduler: ${categories.length} alerta(s) operativa(s) pendiente(s) pero WhatsApp está "${wa.status}". ` +
        `Conecta WhatsApp en Configuración → WhatsApp para enviarlas.`
      )
    }
    return
  }

  for (const cat of categories) {
    const MAX_ITEMS = 15
    const shown = cat.lines.slice(0, MAX_ITEMS)
    const extra = cat.lines.length - shown.length
    const message = `${cat.header}\n\n${shown.map((l) => `• ${l}`).join('\n')}` + (extra > 0 ? `\n\n...y ${extra} más.` : '')
    try {
      await sendWhatsAppMessage(phone, message)
      await cat.mark()
      console.log(`📤 Alerta operativa enviada: ${cat.header.replace(/\*/g, '')}`)
    } catch (e) {
      console.error(`scheduler: fallo al enviar alerta operativa (${cat.header}):`, e.message)
    }
  }
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
    tickCartera().catch((e) => console.error('scheduler cartera tick error:', e.message))
    tickQuoteFollowUp().catch((e) => console.error('scheduler quote follow-up tick error:', e.message))
    tickOpsAlerts().catch((e) => console.error('scheduler ops alerts tick error:', e.message))
  }, TICK_MS)
  // first tick after a short delay so Baileys has time to connect
  setTimeout(() => {
    tick().catch((e) => console.error('scheduler initial tick error:', e.message))
    tickCartera().catch((e) => console.error('scheduler cartera initial tick error:', e.message))
    tickQuoteFollowUp().catch((e) => console.error('scheduler quote follow-up initial tick error:', e.message))
    tickOpsAlerts().catch((e) => console.error('scheduler ops alerts initial tick error:', e.message))
  }, 10_000)
  console.log('⏰ Scheduler de recordatorios iniciado (cada 60s)')
}
