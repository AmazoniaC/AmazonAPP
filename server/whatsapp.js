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
export async function startWhatsApp() {
  if (sock || connecting) return
  connecting = true
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  const baileys = await loadBaileys()
  if (!baileys) return

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
  connecting = false
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: makeSilentLogger(),
    browser: ['Amazonia ERP', 'Chrome', '1.0.0'],
  })

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

function normalizePhone(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length < 8) return null
  return `${digits}@s.whatsapp.net`
}

export async function sendWhatsAppMessage(phone, text) {
  if (!sock || status !== 'connected') {
    const reason = lastError ? ` (${lastError})` : ''
    throw new Error(`WhatsApp no está conectado [estado: ${status}]${reason}. Escanea el QR desde Configuración → WhatsApp.`)
  }
  const jid = normalizePhone(phone)
  if (!jid) throw new Error(`Teléfono inválido: "${phone}". Debe contener al menos 8 dígitos con código de país.`)
  await sock.sendMessage(jid, { text })
  return true
}
