// Sends a WhatsApp message through the server's linked Baileys session so the
// user doesn't have to open a wa.me chat by hand. Falls back to the manual
// flow (download the photo, if any, then open wa.me with the text pre-filled)
// when the server isn't connected — wa.me links can't attach files, so a
// photo has to be downloaded first for the user to attach themselves.
import { openWhatsApp } from './whatsapp'
import { toast } from '../components/Toast'
import { getAuthHeader } from './auth'

interface SendWhatsAppParams {
  phone: string
  message: string
  photo?: string
  fileName?: string
  successLabel?: string
}

export async function sendWhatsAppAuto({
  phone, message, photo, fileName, successLabel,
}: SendWhatsAppParams): Promise<boolean> {
  try {
    const res = photo
      ? await fetch('/api/whatsapp/send-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({
            phone, base64: photo, fileName: fileName || 'imagen.jpg',
            mimetype: 'image/jpeg', caption: message,
          }),
        })
      : await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ phone, text: message }),
        })
    if (res.ok) {
      toast.success(successLabel ?? (photo ? 'Mensaje y foto enviados por WhatsApp' : 'Mensaje enviado por WhatsApp'))
      return true
    }
  } catch { /* server unreachable — fall through to the manual flow below */ }

  if (photo) {
    const a = document.createElement('a')
    a.href = photo
    a.download = fileName || 'imagen.jpg'
    a.click()
  }
  openWhatsApp(phone, message)
  toast.info(
    photo
      ? 'WhatsApp no está conectado en el servidor. Descargamos la imagen — adjúntala en el chat que se abrió. (Conéctalo en Configuración → WhatsApp para envío automático)'
      : 'WhatsApp no está conectado en el servidor — se abrió el chat para enviar manualmente. (Conéctalo en Configuración → WhatsApp para envío automático)'
  )
  return false
}
