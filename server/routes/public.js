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

// Public-safe slice of products — never the full /api/products, which also
// carries `cost`/`costOverride` (what the business pays, not what it
// charges) and every inactive/hidden product. A visitor's network tab can
// always see whatever this endpoint returns, so cost and hidden products
// must never reach it in the first place, not just be hidden in the UI.
router.get('/products', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, category, description, price::float, unit, image,
              stock::float,
              COALESCE(variants, '[]'::jsonb) AS variants,
              COALESCE(images, '[]'::jsonb) AS images,
              is_featured AS "isFeatured",
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
       FROM products
       WHERE is_active = TRUE AND show_in_catalog = TRUE
       ORDER BY is_featured DESC, created_at DESC NULLS LAST`
    )
    const sanitized = rows.map((r) => ({
      ...r,
      variants: (r.variants || [])
        .filter((v) => v.isActive !== false)
        .map(({ costOverride, ...rest }) => rest),
    }))
    res.json(sanitized)
  } catch (e) {
    console.error('public products error:', e.message)
    res.status(500).json({ error: 'No se pudo cargar el catálogo.' })
  }
})

// Branding-only slice of settings — the public catalog needs the company
// name/logo/contact info to render, but the full settings object also
// carries bank details, SMTP credentials and the WhatsApp session state,
// none of which should ever be reachable without a login.
router.get('/settings', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT company_name AS "companyName", slogan, phone, email, address,
              whatsapp, instagram, instagram_handle AS "instagramHandle",
              tiktok, logo,
              catalog_about           AS "catalogAbout",
              catalog_shipping_policy AS "catalogShippingPolicy",
              catalog_returns_policy  AS "catalogReturnsPolicy",
              COALESCE(catalog_faq, '[]'::jsonb) AS "catalogFaq"
       FROM settings WHERE id = 1`
    )
    res.json(rows[0] ?? {})
  } catch (e) {
    console.error('public settings error:', e.message)
    res.status(500).json({ error: 'No se pudo cargar la información de la tienda.' })
  }
})

// The logo is stored as a base64 data: URI (see Settings.tsx's handleLogoChange),
// which works fine for <img src> inside the React app but is useless for link
// previews: WhatsApp/Facebook/Slack's preview crawlers fetch `og:image` over
// HTTP and ignore data: URIs entirely. This route decodes the stored data URI
// back into real image bytes at a stable URL the crawler can actually fetch.
router.get('/logo', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT logo FROM settings WHERE id = 1')
    const dataUri = rows[0]?.logo
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUri || '')
    if (!match) return res.status(404).end()
    res.set('Content-Type', match[1])
    res.set('Cache-Control', 'public, max-age=300')
    res.send(Buffer.from(match[2], 'base64'))
  } catch (e) {
    console.error('public logo error:', e.message)
    res.status(500).end()
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
        console.log(`📤 Aviso de pedido web enviado a ${notifyPhone} (${quoteNumber})`)
      } else {
        // This used to fail completely silently — no error, no log — so a
        // missing WhatsApp/phone in Configuración → Empresa looked
        // indistinguishable from "working but nobody happened to order
        // anything". Now it at least shows up in the server logs.
        console.warn(`⚠️  public order-requests: pedido ${quoteNumber} recibido pero no hay WhatsApp/teléfono configurado en Configuración → Empresa — no se envió aviso.`)
      }
    } catch (e) {
      console.error('public order-requests: fallo al notificar por WhatsApp:', e.message)
    }

    // Confirmation back to the customer — independent try/catch from the
    // business-owner notification above: a visitor's phone not being on
    // WhatsApp, or WhatsApp being disconnected, must never block the owner's
    // alert or fail the order itself. Previously the only confirmation was
    // the on-screen message, lost the moment the visitor closed the tab.
    let customerNotified = false
    try {
      const lines = orderItems.map((i) => `• ${i.product} × ${i.qty}`)
      const firstName = (customerLabel || '').trim().split(/\s+/)[0] || ''
      const msg = `✅ *Pedido recibido* — ${quoteNumber}\n\n${firstName ? `Gracias ${firstName}, r` : 'R'}ecibimos tu pedido:\n\n${lines.join('\n')}\n\nTotal: $${total.toLocaleString('es-CO')}\n\nTe contactaremos pronto para confirmar los detalles. Si tienes alguna duda, escríbenos por este mismo WhatsApp.`
      await sendWhatsAppMessage(customerPhone, msg)
      customerNotified = true
      console.log(`📤 Confirmación de pedido web enviada al cliente ${customerPhone} (${quoteNumber})`)
    } catch (e) {
      console.warn(`⚠️  public order-requests: no se pudo enviar confirmación al cliente (${quoteNumber}):`, e.message)
    }

    res.status(201).json({ ok: true, quoteNumber, total, customerNotified })
  } catch (e) {
    await client.query('ROLLBACK')
    // Unlike the rest of this file's handlers (all gated behind a login),
    // this one is reachable by anyone on the internet — a raw Postgres
    // error message here could leak schema/column details to a stranger.
    // The real message still goes to the server's own logs.
    console.error('public order-requests error:', e.message)
    res.status(500).json({ error: 'No se pudo procesar el pedido. Intenta de nuevo en unos minutos.' })
  } finally {
    client.release()
  }
})

// Lets a customer check their order status without logging in — they only
// ever got an on-screen confirmation and a WhatsApp message with the quote
// number, with no way to come back and check progress later. Requires BOTH
// the quote number AND the phone on file to match (not just the quote
// number, which is a short sequential code anyone could guess/enumerate) so
// a stranger can't browse other customers' orders.
router.post('/order-lookup', async (req, res) => {
  const { quoteNumber, phone } = req.body || {}
  if (!quoteNumber || !phone) {
    return res.status(400).json({ error: 'Escribe el número de cotización y el teléfono.' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT q.quote_number AS "quoteNumber", q.status, q.date, q.valid_until AS "validUntil",
              q.items, q.total::float, q.converted_to_order_id AS "convertedToOrderId",
              c.phone AS "customerPhone"
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       WHERE UPPER(q.quote_number) = UPPER($1)`,
      [String(quoteNumber).trim()]
    )
    const order = rows[0]
    const phoneDigits = digitsOnly(phone)
    // Same generic message whether the quote number doesn't exist or the
    // phone doesn't match it — never reveal which half was wrong, that's an
    // enumeration oracle for guessing valid quote numbers.
    if (!order || !order.customerPhone || digitsOnly(order.customerPhone) !== phoneDigits) {
      return res.status(404).json({ error: 'No encontramos un pedido con esos datos. Revisa el número de cotización y el teléfono.' })
    }

    let saleOrderStatus = null
    let saleOrderDeliveryDate = null
    if (order.convertedToOrderId) {
      const { rows: soRows } = await pool.query(
        `SELECT status, delivery_date AS "deliveryDate" FROM sale_orders WHERE id = $1`,
        [order.convertedToOrderId]
      )
      saleOrderStatus = soRows[0]?.status ?? null
      saleOrderDeliveryDate = soRows[0]?.deliveryDate ?? null
    }

    res.json({
      quoteNumber: order.quoteNumber,
      status: order.status,
      date: order.date,
      validUntil: order.validUntil,
      items: order.items,
      total: order.total,
      saleOrderStatus,
      saleOrderDeliveryDate,
    })
  } catch (e) {
    console.error('public order-lookup error:', e.message)
    res.status(500).json({ error: 'No se pudo consultar el pedido. Intenta de nuevo en unos minutos.' })
  }
})

export default router
