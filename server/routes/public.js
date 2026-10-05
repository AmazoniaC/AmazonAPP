import { Router } from 'express'
import { pool } from '../db.js'
import { log } from '../audit.js'
import { validate } from '../middleware/validate.js'
import { createPublicOrderSchema } from '../schemas/publicOrders.js'
import { sendWhatsAppMessage } from '../whatsapp.js'

const router = Router()

const digitsOnly = (s) => (s || '').replace(/\D/g, '')

// Mirrors src/utils/orderNumber.ts — the public route runs server-side only
// and can't import frontend code, so the sequencing logic is duplicated here.
function nextOrderNumber(existingNumbers, prefix, pad = 3) {
  let maxSeq = 0
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)
  for (const num of existingNumbers) {
    const m = num?.match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > maxSeq) maxSeq = n
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(pad, '0')}`
}

// Branding-only slice of settings — the public catalog needs the company
// name/logo/contact info to render, but the full settings object also
// carries bank details, SMTP credentials and the WhatsApp session state,
// none of which should ever be reachable without a login.
router.get('/settings', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT company_name AS "companyName", slogan, phone, email, address,
              whatsapp, instagram, instagram_handle AS "instagramHandle",
              tiktok, logo
       FROM settings WHERE id = 1`
    )
    res.json(rows[0] ?? {})
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Public "request to order" from the catalog: never writes a SaleOrder or
// touches stock directly — it lands as a draft Quotation (source='web') in
// the same Cotizaciones queue the sales team already works from, so a human
// reviews and converts it like any other quote instead of it silently
// becoming a confirmed, billable order.
router.post('/order-requests', validate(createPublicOrderSchema), async (req, res) => {
  const { customerName, customerPhone, customerEmail, notes, items } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Re-read every product/variant from the DB — price and name always come
    // from here, never from the request body, so a tampered payload can't
    // under-price an order or invent a product that doesn't exist.
    const productIds = [...new Set(items.map((i) => i.productId))]
    const { rows: products } = await client.query(
      `SELECT id, name, price::float, is_active AS "isActive", COALESCE(variants, '[]'::jsonb) AS variants
       FROM products WHERE id = ANY($1)`,
      [productIds]
    )
    const productById = new Map(products.map((p) => [p.id, p]))

    const orderItems = []
    for (const item of items) {
      const product = productById.get(item.productId)
      if (!product || !product.isActive) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `Producto no disponible: ${item.productId}` })
      }
      let price = product.price
      let label = product.name
      if (item.variantId) {
        const variant = (product.variants ?? []).find((v) => v.id === item.variantId)
        if (!variant) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: `Variante no disponible para ${product.name}` })
        }
        price = variant.price ?? product.price
        const attrs = Object.values(variant.attributes ?? {}).filter(Boolean).join(' / ')
        if (attrs) label = `${product.name} — ${attrs}`
      }
      const qty = item.qty
      orderItems.push({
        product: label, productId: product.id, variantId: item.variantId ?? undefined,
        qty, price, subtotal: Math.round(price * qty * 100) / 100,
      })
    }

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0)
    const { rows: settingsRows } = await client.query('SELECT tax_rate::float AS "taxRate" FROM settings WHERE id = 1')
    const taxRate = settingsRows[0]?.taxRate ?? 0
    const tax = Math.round(subtotal * taxRate * 100) / 100
    const total = subtotal + tax

    // Find an existing customer by phone (digits-only match so formatting
    // differences don't create duplicates), otherwise create a minimal one —
    // same as how a walk-in customer gets registered from the POS flow.
    const phoneDigits = digitsOnly(customerPhone)
    const { rows: existingCustomers } = await client.query(
      `SELECT id, name FROM customers WHERE regexp_replace(phone, '\\D', '', 'g') = $1 LIMIT 1`,
      [phoneDigits]
    )
    let customerId, customerLabel
    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id
      customerLabel = existingCustomers[0].name
    } else {
      customerId = `cust_web_${Date.now()}`
      customerLabel = customerName
      await client.query(
        `INSERT INTO customers (id, code, name, email, phone, segment, total_purchases, is_active, notes)
         VALUES ($1,$2,$3,$4,$5,'regular',0,TRUE,$6)`,
        [customerId, '', customerName, customerEmail || '', customerPhone, 'Creado desde el catálogo público']
      )
    }

    const { rows: existingQuotes } = await client.query(`SELECT quote_number FROM quotations`)
    const year = new Date().getFullYear()
    const quoteNumber = nextOrderNumber(existingQuotes.map((r) => r.quote_number), `COT-${year}-`, 3)
    const quoteId = `quo_web_${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    await client.query(
      `INSERT INTO quotations
         (id, quote_number, customer, customer_id, items, subtotal, tax, total,
          status, valid_until, date, notes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10,$11,'web')`,
      [quoteId, quoteNumber, customerLabel, customerId, JSON.stringify(orderItems),
       subtotal, tax, total, validUntil, today, notes ?? '']
    )

    await client.query('COMMIT')

    await log({
      userName: 'Cliente web', userEmail: '', action: 'crear',
      entity: 'Cotización', entityId: quoteId, entityName: quoteNumber,
      details: `Pedido recibido desde el catálogo público — ${customerLabel} (${customerPhone})`,
    })

    // Best-effort notification — a WhatsApp failure must never fail the
    // visitor's order confirmation.
    try {
      const { rows: s2 } = await pool.query(`SELECT whatsapp, phone FROM settings WHERE id = 1`)
      const notifyPhone = (s2[0]?.whatsapp || s2[0]?.phone || '').trim()
      if (notifyPhone) {
        const lines = orderItems.map((i) => `• ${i.product} × ${i.qty}`)
        const msg = `🛒 *Nuevo pedido web* ${quoteNumber}\n\n${customerLabel} — ${customerPhone}\n\n${lines.join('\n')}\n\nTotal: $${total.toLocaleString('es-CO')}\n\nRevísalo en Cotizaciones.`
        await sendWhatsAppMessage(notifyPhone, msg)
      }
    } catch (e) {
      console.error('public order-requests: fallo al notificar por WhatsApp:', e.message)
    }

    res.status(201).json({ ok: true, quoteNumber, total })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

export default router
