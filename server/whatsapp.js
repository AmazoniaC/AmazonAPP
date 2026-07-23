// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp service — uses Baileys to keep a persistent WhatsApp Web session
// authenticated against the user's own number. Free, runs locally inside the
// existing Node server. Auth state is persisted to disk so the QR is only
// scanned once.
// ─────────────────────────────────────────────────────────────────────────────
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '.wa-auth')

let sock = null
let currentQR = null         // raw QR string (not yet scanned)
let currentQRDataUrl = null  // data URL ready to render in <img>
let status = 'disconnected'  // 'disconnected' | 'connecting' | 'qr' | 'connected'
let lastError = null
let baileysAvailable = true
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 5 * 60 * 1000 // cap at 5 minutes

async function loadBaileys() {
  try {
    const mod = await import('@whiskeysockets/baileys')
    return mod
  } catch (e) {
    baileysAvailable = false
    lastError = 'Baileys no instalado. Ejecuta: npm install'
    console.warn('⚠️  WhatsApp deshabilitado:', e.message)
    return null
  }
}

let connecting = false
/**
 * Start (or restart) the WhatsApp socket.
 * @param {boolean} force  When true, tears down an existing non-connected
 *   socket first so a fresh QR can be generated (used by the "Generar QR"
 *   button when a previous attempt got stuck).
 */
export async function startWhatsApp(force = false) {
  // If we're being forced and there's a socket that isn't fully connected,
  // discard it so we can start clean.
  if (force && sock && status !== 'connected') {
    try { sock.end?.(new Error('force restart')) } catch {}
    sock = null
    status = 'disconnected'
    connecting = false
  }
  if (sock || connecting) return
  connecting = true

  try {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

    const baileys = await loadBaileys()
    if (!baileys) { connecting = false; status = 'disconnected'; return }

    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    let version
    try {
      const v = await fetchLatestBaileysVersion()
      version = v.version
    } catch { /* offline — Baileys uses bundled default */ }

    // Minimal pino-compatible silent logger. Baileys calls .child() recursively
    // so it must return another logger of the same shape.
    const makeSilentLogger = () => {
      const logger = {
        level: 'silent',
        trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
        child() { return makeSilentLogger() },
      }
      return logger
    }

    status = 'connecting'
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: makeSilentLogger(),
      browser: ['Amazonia ERP', 'Chrome', '1.0.0'],
    })
    // Socket built successfully — clear the connecting guard so event handlers
    // (and any future /connect) behave correctly.
    connecting = false

    sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      currentQR = qr
      try { currentQRDataUrl = await QRCode.toDataURL(qr) } catch { currentQRDataUrl = null }
      status = 'qr'
      console.log('📱 WhatsApp: escanea el QR desde Settings → WhatsApp')
    }
    if (connection === 'open') {
      status = 'connected'
      currentQR = null
      currentQRDataUrl = null
      lastError = null
      reconnectAttempts = 0
      console.log('✅ WhatsApp conectado')
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      status = 'disconnected'
      sock = null
      lastError = lastDisconnect?.error?.message || null
      console.log('🔌 WhatsApp desconectado', loggedOut ? '(logged out)' : `— reintento #${reconnectAttempts + 1}`)
      if (loggedOut) {
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }) } catch {}
        reconnectAttempts = 0
        setTimeout(() => startWhatsApp().catch(() => {}), 1000)
      } else {
        // Exponential backoff: 3s, 6s, 12s, 24s, ... capped at 5 minutes
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
        reconnectAttempts++
        console.log(`   ↳ Reintentando en ${Math.round(delay / 1000)}s`)
        setTimeout(() => startWhatsApp().catch(() => {}), delay)
      }
    }
    })
  } catch (e) {
    // Socket construction failed — reset state so the UI doesn't get stuck on
    // "Conectando…" and a later /connect can retry.
    connecting = false
    sock = null
    status = 'disconnected'
    lastError = e?.message || 'No se pudo iniciar WhatsApp'
    console.error('⚠️  startWhatsApp error:', lastError)
  }
}

export function getWhatsAppStatus() {
  return {
    available: baileysAvailable,
    status,
    qr: currentQRDataUrl,
    error: lastError,
  }
}

export async function logoutWhatsApp() {
  try {
    if (sock) await sock.logout()
  } catch {}
  sock = null
  status = 'disconnected'
  currentQR = null
  currentQRDataUrl = null
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }) } catch {}
  // restart fresh so a new QR appears
  setTimeout(() => startWhatsApp().catch(() => {}), 500)
}

// Default country code for numbers entered without one (Colombia = 57).
const DEFAULT_COUNTRY_CODE = process.env.WA_COUNTRY_CODE || '57'

/**
 * Turn a user-entered phone into E.164 digits (no '+'), defaulting to Colombia.
 * Handles the common ways a Colombian user types their number:
 *   "3001234567"        → 573001234567   (10-digit mobile, prepend 57)
 *   "300 123 4567"      → 573001234567
 *   "+57 300 123 4567"  → 573001234567   (already has code)
 *   "573001234567"      → 573001234567   (already has code)
 *   "6041234567"        → 576041234567   (10-digit landline)
 * Returns null when there aren't enough digits to be a real number.
 */
function toE164Digits(phone) {
  if (!phone) return null
  let digits = String(phone).replace(/\D/g, '')
  if (digits.length < 7) return null
  // Strip a leading 00 international prefix if present
  if (digits.startsWith('00')) digits = digits.slice(2)
  // Already has the Colombian country code
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length >= 11) return digits
  // Bare 10-digit Colombian number (mobile or landline) → prepend country code
  if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits
  // Some users store the old 7-digit landline — prepend code (best effort)
  if (digits.length >= 7 && digits.length <= 9) return DEFAULT_COUNTRY_CODE + digits
  // Otherwise assume it already carries a country code
  return digits
}

function normalizePhone(phone) {
  const digits = toE164Digits(phone)
  if (!digits) return null
  return `${digits}@s.whatsapp.net`
}

export async function sendWhatsAppMessage(phone, text) {
  if (!sock || status !== 'connected') {
    const reason = lastError ? ` (${lastError})` : ''
    throw new Error(`WhatsApp no está conectado [estado: ${status}]${reason}. Escanea el QR desde Configuración → WhatsApp.`)
  }
  const digits = toE164Digits(phone)
  if (!digits) throw new Error(`Teléfono inválido: "${phone}". Debe contener al menos 7 dígitos.`)
  const jid = `${digits}@s.whatsapp.net`

  // Verify the number is actually registered on WhatsApp before sending, so we
  // never mark a reminder as delivered to a non-existent account.
  try {
    if (typeof sock.onWhatsApp === 'function') {
      const results = await sock.onWhatsApp(jid)
      const found = Array.isArray(results) && results.some((r) => r?.exists)
      if (!found) {
        throw new Error(`El número +${digits} no está registrado en WhatsApp.`)
      }
    }
  } catch (e) {
    // If the check itself errored (network/proto), rethrow a clear message;
    // if it was our "not registered" error, propagate it too.
    if (e.message && e.message.includes('no está registrado')) throw e
    // onWhatsApp lookup failed for another reason — fall through and try to send
  }

  await sock.sendMessage(jid, { text })
  return true
}

/**
 * Send a document (e.g. a PDF quotation/invoice) via WhatsApp, with an optional
 * text caption. `base64` is the raw base64 of the file (no data: prefix).
 */
export async function sendWhatsAppDocument(phone, { base64, fileName, mimetype, caption }) {
  if (!sock || status !== 'connected') {
    const reason = lastError ? ` (${lastError})` : ''
    throw new Error(`WhatsApp no está conectado [estado: ${status}]${reason}. Escanea el QR desde Configuración → WhatsApp.`)
  }
  if (!base64) throw new Error('No se recibió el documento a enviar.')
  const digits = toE164Digits(phone)
  if (!digits) throw new Error(`Teléfono inválido: "${phone}". Debe contener al menos 7 dígitos.`)
  const jid = `${digits}@s.whatsapp.net`

  // Verify the number is registered before sending.
  try {
    if (typeof sock.onWhatsApp === 'function') {
      const results = await sock.onWhatsApp(jid)
      const found = Array.isArray(results) && results.some((r) => r?.exists)
      if (!found) throw new Error(`El número +${digits} no está registrado en WhatsApp.`)
    }
  } catch (e) {
    if (e.message && e.message.includes('no está registrado')) throw e
  }

  // Strip an accidental data: prefix if present
  const cleanB64 = String(base64).includes(',') ? String(base64).split(',').pop() : base64
  const buffer = Buffer.from(cleanB64, 'base64')

  await sock.sendMessage(jid, {
    document: buffer,
    mimetype: mimetype || 'application/pdf',
    fileName: fileName || 'documento.pdf',
    caption: caption || undefined,
  })
  return true
}
