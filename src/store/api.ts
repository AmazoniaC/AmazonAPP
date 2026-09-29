// ─────────────────────────────────────────────────────────────────────────────
// API fetch helper shared by every slice, plus small cross-cutting bits
// (the WhatsApp send-result toast) that don't belong to any one domain.
// ─────────────────────────────────────────────────────────────────────────────
import { toast } from '../components/Toast'
import type { WhatsAppSendResult } from './types'
import { getAuthHeader as getUserHeader } from '../utils/auth'

// El fallo más común al arrancar en local: se ejecutó solo el frontend y el
// backend no está escuchando. El mensaje dice exactamente qué hacer.
const SERVER_DOWN_MSG =
  'No hay conexión con el servidor. Cierra la terminal y ejecuta "npm run dev", ' +
  'que arranca el backend y la app juntos. Si ya lo hiciste, revisa que PostgreSQL esté encendido.'

// Set by useStore.ts after the store is created, so apiFetch can react to a
// 401 without importing useStore.ts itself (that would be a circular import:
// useStore.ts already imports apiFetch from here).
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const MAX_RETRIES = 2
  const RETRY_DELAYS = [1000, 3000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...getUserHeader() },
        ...options,
      })
    } catch (networkErr) {
      // Network error (server down, no internet, DNS failure)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))
        continue
      }
      throw new Error(SERVER_DOWN_MSG)
    }

    // 503 = el proxy de Vite no encontró el backend (ver vite.config.ts)
    if (res.status === 503) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))
        continue
      }
      throw new Error(SERVER_DOWN_MSG)
    }

    if (res.status === 429) {
      // Rate limited — wait and retry
      if (attempt < MAX_RETRIES) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10)
        await new Promise((r) => setTimeout(r, retryAfter * 1000))
        continue
      }
      throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.')
    }

    if (res.status === 401) {
      localStorage.removeItem('erp_auth')
      onUnauthorized?.()
      throw new Error('Sesión expirada. Inicia sesión de nuevo.')
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Error del servidor (${res.status})`)
    }

    return res.json()
  }

  throw new Error('No se pudo completar la solicitud después de varios intentos.')
}

// Surface the outcome of the automatic WhatsApp confirmation to the user so a
// silent failure (e.g. WhatsApp not connected) never looks like "nothing works".
export function notifyWhatsAppResult(
  item: { notifyWhatsapp?: boolean }, result?: WhatsAppSendResult | null,
): void {
  if (!item.notifyWhatsapp) return
  if (!result) return
  if (result.sent) {
    toast.success('Mensaje enviado por WhatsApp')
  } else if (result.status && result.status !== 'connected') {
    toast.error('WhatsApp no está conectado — conéctalo en Configuración → WhatsApp')
  } else {
    toast.error(`No se pudo enviar por WhatsApp: ${result.error || 'error desconocido'}`)
  }
}
