// ── WhatsApp Notification Utility ────────────────────────────────────────────
// Generates WhatsApp Web links with pre-formatted messages.
// Uses wa.me deep links — works on mobile and desktop without API keys.

import { formatCOP } from './currency'

/** Default message templates with {placeholders} */
export const WA_TEMPLATES = {
  orderConfirmation: `Hola {cliente} 👋

Gracias por tu pedido con {empresa}!

📦 *Orden:* {orden}
📅 *Fecha:* {fecha}
💰 *Total:* {total}
💳 *Método de pago:* {metodo_pago}

*Productos:*
{productos}

{entrega}

Si tienes alguna pregunta, no dudes en escribirnos. ¡Gracias por tu confianza! 🙏`,

  paymentReminder: `Hola {cliente} 👋

Te escribimos de {empresa} para recordarte que tienes un saldo pendiente:

📦 *Orden:* {orden}
📅 *Fecha:* {fecha}
💰 *Total:* {total}
📌 *Estado de pago:* {estado_pago}

{datos_bancarios}

¿Ya realizaste el pago? Envíanos el comprobante por este medio. ¡Gracias! 🙏`,

  dispatchNotification: `Hola {cliente} 👋

¡Tu pedido de {empresa} va en camino! 🚚

📦 *Despacho:* {despacho}
📦 *Orden:* {orden}
📅 *Fecha programada:* {fecha}
⏰ *Hora:* {hora}
🚛 *Conductor:* {conductor}
📍 *Dirección:* {direccion}

*Productos:*
{productos}

Te notificaremos cuando haya sido entregado. ¡Gracias! 🙏`,

  deliveryConfirmation: `Hola {cliente} 👋

Tu pedido de {empresa} ha sido *entregado* exitosamente ✅

📦 *Despacho:* {despacho}
📅 *Entregado:* {fecha_entrega}

¿Recibiste todo en orden? Si tienes alguna observación, escríbenos por este medio.

¡Gracias por tu preferencia! ⭐`,

  followUp: `Hola {cliente} 👋

Soy de {empresa}. Quería saber cómo te ha ido con tu última compra:

📦 *Última orden:* {orden}
📅 *Fecha:* {fecha}

¿Necesitas algo más? Estamos para servirte. ¡Un saludo! 😊`,

  bulkPaymentReminder: `Hola {cliente} 👋

Te escribimos de {empresa}. Tienes *{num_ordenes} orden(es)* con saldo pendiente por un total de *{total_pendiente}*.

{detalle_ordenes}

{datos_bancarios}

¿Ya realizaste algún pago? Envíanos el comprobante. ¡Gracias! 🙏`,
}

export type WaTemplateKey = keyof typeof WA_TEMPLATES

/**
 * Fill `{placeholder}` tokens in a template. Uses split/join rather than
 * String#replace, because replace() re-interprets `$&`, `$$`, `` $` ``, etc.
 * inside the REPLACEMENT string (JS's "GetSubstitution" semantics apply even
 * for a plain-string search pattern) — a customer/company name containing a
 * literal `$` would otherwise corrupt or truncate the message.
 */
function fillTemplate(template: string, values: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.split(`{${key}}`).join(value)
  }
  return result
}

/** Default country code for numbers entered without one (Colombia = 57). */
const DEFAULT_COUNTRY_CODE = '57'

/**
 * Normalize a phone for wa.me: return E.164 digits (no '+'), defaulting to
 * Colombia when the number is a bare 10-digit local number. This ensures
 * WhatsApp opens the correct chat instead of an invalid/US number.
 */
export function cleanPhone(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length >= 11) return digits
  if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits
  if (digits.length >= 7 && digits.length <= 9) return DEFAULT_COUNTRY_CODE + digits
  return digits
}

/** Open WhatsApp with a pre-filled message */
export function openWhatsApp(phone: string, message: string): void {
  const clean = cleanPhone(phone)
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank')
}

/** Build an order confirmation message */
export function buildOrderConfirmation(params: {
  companyName: string
  customer: string
  phone: string
  orderNumber: string
  date: string
  total: number
  paymentMethod: string
  items: { product: string; qty: number; price: number; subtotal: number }[]
  deliveryDate?: string
  bankInfo?: string
}): string {
  const productos = params.items
    .map(i => `  • ${i.product} × ${i.qty} — ${formatCOP(i.subtotal)}`)
    .join('\n')
  const entrega = params.deliveryDate
    ? `🚚 *Entrega estimada:* ${params.deliveryDate}`
    : ''

  return fillTemplate(WA_TEMPLATES.orderConfirmation, {
    cliente: params.customer,
    empresa: params.companyName,
    orden: params.orderNumber,
    fecha: params.date,
    total: formatCOP(params.total),
    metodo_pago: params.paymentMethod,
    productos,
    entrega,
  })
}

/** Build a payment reminder message */
export function buildPaymentReminder(params: {
  companyName: string
  customer: string
  orderNumber: string
  date: string
  total: number
  paymentStatus: string
  bankInfo?: string
}): string {
  const estadoPago = params.paymentStatus === 'partial' ? 'Pago parcial' : 'Pendiente'
  const datosBancarios = params.bankInfo
    ? `💳 *Datos de pago:*\n${params.bankInfo}`
    : ''

  return fillTemplate(WA_TEMPLATES.paymentReminder, {
    cliente: params.customer,
    empresa: params.companyName,
    orden: params.orderNumber,
    fecha: params.date,
    total: formatCOP(params.total),
    estado_pago: estadoPago,
    datos_bancarios: datosBancarios,
  })
}

/** Build a dispatch notification message */
export function buildDispatchNotification(params: {
  companyName: string
  customer: string
  dispatchNumber: string
  orderNumber: string
  scheduledDate: string
  scheduledTime?: string
  driver: string
  address?: string
  items: { product: string; qty: number }[]
}): string {
  const productos = params.items
    .map(i => `  • ${i.product} × ${i.qty}`)
    .join('\n')

  return fillTemplate(WA_TEMPLATES.dispatchNotification, {
    cliente: params.customer,
    empresa: params.companyName,
    despacho: params.dispatchNumber,
    orden: params.orderNumber,
    fecha: params.scheduledDate,
    hora: params.scheduledTime || 'Por confirmar',
    conductor: params.driver || 'Por asignar',
    direccion: params.address || 'Por confirmar',
    productos,
  })
}

/** Build a delivery confirmation message */
export function buildDeliveryConfirmation(params: {
  companyName: string
  customer: string
  dispatchNumber: string
  deliveredAt: string
}): string {
  return fillTemplate(WA_TEMPLATES.deliveryConfirmation, {
    cliente: params.customer,
    empresa: params.companyName,
    despacho: params.dispatchNumber,
    fecha_entrega: params.deliveredAt,
  })
}

/** Build a follow-up message */
export function buildFollowUp(params: {
  companyName: string
  customer: string
  orderNumber: string
  date: string
}): string {
  return fillTemplate(WA_TEMPLATES.followUp, {
    cliente: params.customer,
    empresa: params.companyName,
    orden: params.orderNumber,
    fecha: params.date,
  })
}

/** Build a quotation share message (for sending the quote itself) */
export function buildQuotationShare(params: {
  companyName: string
  customer: string
  quoteNumber: string
  total: number
  validUntil?: string
  itemsSummary?: string
}): string {
  const validity = params.validUntil
    ? `📅 *Válida hasta:* ${params.validUntil}`
    : ''
  const items = params.itemsSummary ? `\n\n${params.itemsSummary}` : ''
  return `Hola ${params.customer} 👋

Te comparto la cotización que preparamos en *${params.companyName}*:

📄 *Cotización:* ${params.quoteNumber}
💰 *Valor total:* ${formatCOP(params.total)}
${validity}${items}

Cualquier ajuste o pregunta, con gusto te ayudo por acá. ¡Gracias! 🌿`
}

/** Build a quotation follow-up message (nudge after N days) */
export function buildQuotationFollowUp(params: {
  companyName: string
  customer: string
  quoteNumber: string
  daysLeft?: number
}): string {
  const urgency = params.daysLeft !== undefined && params.daysLeft <= 3
    ? `\n\n⏳ Recuerda que la cotización vence en *${params.daysLeft} día${params.daysLeft === 1 ? '' : 's'}*.`
    : ''
  return `Hola ${params.customer} 👋

Te escribo desde *${params.companyName}* para hacer seguimiento a la cotización *${params.quoteNumber}*.${urgency}

¿Pudiste revisarla? Cualquier duda o ajuste, con gusto te ayudo. 🌿`
}

/** Build a bulk payment reminder */
export function buildBulkPaymentReminder(params: {
  companyName: string
  customer: string
  orders: { orderNumber: string; date: string; total: number }[]
  bankInfo?: string
}): string {
  const totalPendiente = params.orders.reduce((a, o) => a + o.total, 0)
  const detalle = params.orders
    .map(o => `  • ${o.orderNumber} — ${o.date} — ${formatCOP(o.total)}`)
    .join('\n')
  const datosBancarios = params.bankInfo
    ? `💳 *Datos de pago:*\n${params.bankInfo}`
    : ''

  return fillTemplate(WA_TEMPLATES.bulkPaymentReminder, {
    cliente: params.customer,
    empresa: params.companyName,
    num_ordenes: String(params.orders.length),
    total_pendiente: formatCOP(totalPendiente),
    detalle_ordenes: detalle,
    datos_bancarios: datosBancarios,
  })
}

/** Get bank info string from company settings */
export function getBankInfo(settings: {
  bankName?: string
  bankAccountType?: string
  bankAccountNumber?: string
  bankMessage?: string
}): string {
  if (!settings.bankName && !settings.bankAccountNumber) return ''
  const parts: string[] = []
  if (settings.bankName) parts.push(`Banco: ${settings.bankName}`)
  if (settings.bankAccountType) parts.push(`Tipo: ${settings.bankAccountType}`)
  if (settings.bankAccountNumber) parts.push(`Cuenta: ${settings.bankAccountNumber}`)
  if (settings.bankMessage) parts.push(settings.bankMessage)
  return parts.join('\n')
}
