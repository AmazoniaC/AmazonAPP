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

export async function startWhatsApp() {
  if (sock) return
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

  status = 'connecting'
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: { level: 'silent', child: () => ({ level: 'silent', trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {}, child() { return this } }), trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} },
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
      console.log('✅ WhatsApp conectado')
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      status = 'disconnected'
      sock = null
      lastError = lastDisconnect?.error?.message || null
      console.log('🔌 WhatsApp desconectado', loggedOut ? '(logged out)' : '— reintentando…')
      if (loggedOut) {
        // wipe credentials so a new QR is generated next time
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }) } catch {}
      }
      setTimeout(() => startWhatsApp().catch(() => {}), loggedOut ? 1000 : 3000)
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
    throw new Error('WhatsApp no está conectado')
  }
  const jid = normalizePhone(phone)
  if (!jid) throw new Error('Teléfono inválido')
  await sock.sendMessage(jid, { text })
  return true
}
