import { Router } from 'express'
import nodemailer from 'nodemailer'
import { pool }   from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

// Free email providers that cannot be used as senders in Resend without verification
const FREE_EMAIL_DOMAINS = ['gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','live.com']

// ── SMTP helpers (nodemailer) ────────────────────────────────────────────────
function buildSmtpFromAddress(displayName, smtpFrom, smtpUser) {
  if (smtpFrom && smtpFrom.trim()) return smtpFrom.trim()
  return `${displayName} <${smtpUser}>`
}

function isSmtpConfigured(s) {
  return !!(s && s.smtpHost && s.smtpUser && s.smtpPass)
}

function createTransporter(s) {
  const port = Number(s.smtpPort) || 587
  return nodemailer.createTransport({
    host: s.smtpHost,
    port,
    secure: port === 465, // true for 465 (SMTPS), false for 587/STARTTLS
    auth: { user: s.smtpUser, pass: s.smtpPass },
    // Reasonable timeouts so the request doesn't hang forever
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

async function sendViaSmtp({ settings, to, subject, html, text, pdfBase64, pdfFilename }) {
  const transporter = createTransporter(settings)
  // Some SMTP servers (corporate Outlook, certain Gmail setups) reject the
  // EHLO/verify handshake but still accept real sendMail. Run verify as a
  // best-effort probe and only log the warning — the actual send call below
  // is the source of truth.
  try {
    await transporter.verify()
  } catch (verifyErr) {
    console.warn('SMTP verify falló (intentando envío de todas formas):', verifyErr.message)
  }
  const from = buildSmtpFromAddress(settings.companyName || 'Amazonia ERP', settings.smtpFrom, settings.smtpUser)
  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    attachments: pdfBase64 ? [{
      filename: pdfFilename || 'documento.pdf',
      content: Buffer.from(pdfBase64, 'base64'),
      contentType: 'application/pdf',
    }] : undefined,
  })
}

/**
 * Build a safe "From" address for Resend.
 * - If customFrom contains a verified custom domain → use it as-is
 * - Otherwise fall back to "DisplayName <onboarding@resend.dev>"
 */
function buildFromAddress(displayName, customFrom) {
  if (customFrom) {
    // Extract domain from "Name <email>" or plain "email"
    const match = customFrom.match(/<([^>]+)>/) || customFrom.match(/(\S+@\S+)/)
    const email  = match ? match[1] : null
    const domain = email ? email.split('@')[1]?.toLowerCase() : null
    if (domain && !FREE_EMAIL_DOMAINS.includes(domain)) {
      // Custom (potentially verified) domain — use as provided
      return customFrom
    }
  }
  // Safe fallback: display name + Resend's shared domain (no verification needed)
  return `${displayName} <onboarding@resend.dev>`
}

// ── Build HTML invoice ────────────────────────────────────────────────────────
function buildInvoiceHtml({ order, customer, settings }) {
  const fmt = (n) =>
    '$ ' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const invoiceNum = (order.orderNumber ?? '').split('-').pop() ?? '001'

  const itemRows = order.items.map((item) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;border-right:1px solid #eee;font-size:13px;">${item.product}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;border-right:1px solid #eee;font-size:13px;text-align:center;">${String(item.qty).padStart(2,'0')}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;border-right:1px solid #eee;font-size:13px;text-align:center;">${fmt(item.price)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;">${fmt(item.subtotal)}</td>
    </tr>`).join('')

  const concreteBg = 'linear-gradient(120deg,#888 0%,#b0aea8 20%,#ccc9c4 45%,#b5b2ad 70%,#909090 100%)'
  const darkBg     = 'linear-gradient(120deg,#2c2c2c 0%,#454545 30%,#3a3a3a 60%,#252525 100%)'
  const green      = '#1B4332'

  const logoHtml = settings.logo
    ? `<img src="${settings.logo}" alt="Logo" style="height:110px;width:auto;object-fit:contain;">`
    : `<div style="text-align:right;">
         <div style="font-size:28px;font-weight:900;color:${green};letter-spacing:2px;">${(settings.companyName || 'Amazonia Concrete').toUpperCase()}</div>
         <div style="font-size:10px;letter-spacing:4px;color:#444;border-top:1px solid #666;padding-top:3px;margin-top:2px;">CONCRETE</div>
       </div>`

  const bankSection = (settings.bankKey || settings.bankAccountNumber) ? `
    <div style="padding:16px 48px 28px;">
      <div style="display:inline-flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <span style="background:#fcd116;border:1px solid #e8b800;border-radius:4px;padding:5px 10px;font-weight:800;font-size:12px;color:#333;white-space:nowrap;">${settings.bankName || 'Bancolombia'} 🇨🇴</span>
        <div style="font-size:13px;line-height:1.9;color:#333;">
          ${settings.bankKey ? `<div>Llave: ${settings.bankKey}</div>` : ''}
          ${settings.bankAccountNumber ? `<div>${settings.bankAccountType || 'Cuenta Ahorros'}: ${settings.bankAccountNumber}</div>` : ''}
        </div>
      </div>
      ${settings.bankMessage ? `<div style="border:1.5px solid #222;display:inline-block;padding:7px 18px;font-size:13px;color:#111;">${settings.bankMessage}</div>` : ''}
    </div>` : ''

  const socialLinks = [
    settings.tiktok    ? `<div style="margin:4px 0;font-size:12px;">🎵 ${settings.tiktok}</div>` : '',
    settings.whatsapp  ? `<div style="margin:4px 0;font-size:12px;">📱 ${settings.whatsapp}</div>` : '',
    settings.instagram ? `<div style="margin:4px 0;font-size:12px;">📸 ${settings.instagram}</div>` : '',
  ].join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Factura ${order.orderNumber}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:700px;margin:20px auto;background:white;box-shadow:0 2px 12px rgba(0,0,0,.15);">

  <!-- HEADER -->
  <div style="background:${concreteBg};padding:40px 48px 32px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:52px;font-weight:900;color:${green};letter-spacing:-1px;line-height:1;">FACTURA</div>
      <div style="margin-top:12px;background:white;border:1.5px solid #888;padding:5px 20px;display:inline-block;">
        <span style="font-size:15px;font-weight:700;color:#222;">Nº: ${invoiceNum}</span>
      </div>
    </div>
    <div style="text-align:right;">${logoHtml}</div>
  </div>

  <!-- CLIENT + COMPANY -->
  <div style="padding:36px 48px;display:flex;border-bottom:1px solid #e0e0e0;">
    <div style="flex:1;border-right:1.5px solid #ccc;padding-right:40px;">
      <p style="font-weight:800;font-size:12px;margin:0 0 14px;letter-spacing:.5px;color:${green};">DATOS DEL CLIENTE</p>
      <p style="font-size:14px;margin:5px 0;color:${green};">${customer.name}</p>
      ${customer.email ? `<p style="font-size:13px;margin:5px 0;color:${green};">${customer.email}</p>` : ''}
      ${customer.phone ? `<p style="font-size:13px;margin:5px 0;color:${green};">${customer.phone}</p>` : ''}
      ${customer.city  ? `<p style="font-size:13px;margin:5px 0;color:${green};">${customer.city}</p>` : ''}
    </div>
    <div style="flex:1;padding-left:40px;text-align:right;">
      <p style="font-weight:800;font-size:15px;margin:0 0 12px;color:#111;text-transform:uppercase;">${settings.companyName}</p>
      ${settings.email ? `<p style="font-size:13px;margin:5px 0;color:#555;">${settings.email}</p>` : ''}
      ${settings.instagramHandle ? `<p style="font-size:13px;margin:5px 0;color:#555;">${settings.instagramHandle}</p>` : ''}
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div style="padding:32px 48px 16px;">
    <table style="width:100%;border-collapse:collapse;border:1.5px solid #333;">
      <thead>
        <tr style="border-bottom:1.5px solid #333;background:#f5f5f5;">
          <th style="text-align:left;padding:12px 18px;font-size:14px;font-weight:700;border-right:1px solid #bbb;">Detalle</th>
          <th style="text-align:center;padding:12px 16px;font-size:14px;font-weight:700;border-right:1px solid #bbb;width:100px;">Cantidad</th>
          <th style="text-align:center;padding:12px 16px;font-size:14px;font-weight:700;border-right:1px solid #bbb;width:140px;">Precio</th>
          <th style="text-align:center;padding:12px 16px;font-size:14px;font-weight:700;width:140px;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <!-- DIVIDER -->
  <div style="margin:8px 48px;border-top:1.5px solid #999;"></div>

  <!-- TOTAL -->
  <div style="padding:24px 48px;text-align:right;">
    <table style="border:2px solid #222;min-width:280px;margin-left:auto;">
      <tr>
        <td style="padding:13px 24px;font-weight:800;font-size:15px;letter-spacing:1.5px;">TOTAL</td>
        <td style="padding:13px 24px;text-align:right;font-weight:700;font-size:15px;border-left:1px solid #ccc;">${fmt(order.total)}</td>
      </tr>
    </table>
  </div>

  <!-- BANK INFO -->
  ${bankSection}

  <!-- FOOTER -->
  <div style="background:${darkBg};padding:24px 48px;display:flex;justify-content:space-between;align-items:center;">
    <div style="color:white;">${socialLinks || '<span style="color:#888;font-size:12px;">Amazonia Concrete</span>'}</div>
    <div style="border-left:3px solid #666;padding-left:18px;color:#ddd;font-size:15px;font-style:italic;font-weight:300;letter-spacing:.5px;">
      ${settings.slogan || 'Belleza natural en concreto'}
    </div>
  </div>

</div>
</body></html>`
}

// ── POST /api/email/invoice ───────────────────────────────────────────────────
router.post('/invoice', async (req, res) => {
  const { order, customer, recipientEmail, pdfBase64 } = req.body

  if (!recipientEmail) {
    return res.status(400).json({ error: 'Se requiere el correo del destinatario' })
  }

  // Load all email-related settings from DB
  let settings
  try {
    const { rows } = await pool.query(
      `SELECT company_name AS "companyName", slogan, email,
              bank_name AS "bankName", bank_key AS "bankKey",
              bank_account_type AS "bankAccountType",
              bank_account_number AS "bankAccountNumber",
              bank_message AS "bankMessage",
              tiktok, whatsapp, instagram,
              instagram_handle AS "instagramHandle",
              logo,
              smtp_host AS "smtpHost",
              smtp_port AS "smtpPort",
              smtp_user AS "smtpUser",
              smtp_pass AS "smtpPass",
              smtp_from AS "smtpFrom",
              resend_api_key AS "resendApiKey"
       FROM settings WHERE id = 1`
    )
    settings = rows[0]
  } catch (e) {
    return res.status(500).json({ error: 'Error leyendo configuración: ' + e.message })
  }

  if (!isSmtpConfigured(settings) && !settings?.resendApiKey) {
    return res.status(400).json({
      error: 'Configura un servidor SMTP (recomendado) o una API Key de Resend en '
           + 'Configuración → Empresa → Correo Electrónico.',
    })
  }

  const html = buildInvoiceHtml({ order, customer, settings })
  const subject = `Factura ${order.orderNumber} — ${settings.companyName}`

  // ── 1) Try SMTP (nodemailer) first if configured ─────────────────────────
  if (isSmtpConfigured(settings)) {
    try {
      await sendViaSmtp({
        settings,
        to: recipientEmail,
        subject,
        html,
        pdfBase64,
        pdfFilename: `Factura-${order.orderNumber}.pdf`,
      })
      const u = getUser(req)
      await log({
        userName: u.name, userEmail: u.email,
        action: 'crear', entity: 'Factura',
        entityId: order.id, entityName: `${order.orderNumber} → ${recipientEmail}`,
        details: `Enviada por SMTP a ${recipientEmail}`,
      })
      return res.json({ ok: true, message: `Factura enviada a ${recipientEmail}`, provider: 'smtp' })
    } catch (e) {
      // Translate common SMTP errors so the user can fix them
      const raw = e.message || String(e)
      let friendly = raw
      if (/ENOTFOUND|EAI_AGAIN/i.test(raw))
        friendly = `No se pudo conectar al servidor SMTP "${settings.smtpHost}". Verifica el host.`
      else if (/ECONNREFUSED|ETIMEDOUT/i.test(raw))
        friendly = `Conexión rechazada por ${settings.smtpHost}:${settings.smtpPort}. Verifica puerto y firewall.`
      else if (/Invalid login|535|EAUTH|Username and Password not accepted/i.test(raw))
        friendly = 'Usuario o contraseña SMTP incorrectos. Si usas Gmail, debes generar una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords (no funciona tu contraseña normal).'
      else if (/self.signed certificate|unable to verify/i.test(raw))
        friendly = 'Certificado SSL del servidor SMTP no válido.'
      // If Resend is also configured, fall through and try it as backup
      if (!settings.resendApiKey) {
        return res.status(500).json({ error: `Error SMTP: ${friendly}` })
      }
      console.warn('SMTP falló, intentando Resend como respaldo:', friendly)
    }
  }

  // Always use onboarding@resend.dev as the sending address (no domain verification needed).
  // Only allow a custom domain if the user explicitly configured one (not gmail/hotmail/yahoo/etc.)
  const displayName = settings.companyName || 'Amazonia Concrete'
  const fromAddress = buildFromAddress(displayName, settings.smtpFrom)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject: `Factura ${order.orderNumber} — ${settings.companyName}`,
        html,
        ...(pdfBase64 ? {
          attachments: [{
            filename: `Factura-${order.orderNumber}.pdf`,
            content: pdfBase64,
          }],
        } : {}),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const msg = data.message || JSON.stringify(data)
      if (msg.includes('testing emails') || msg.includes('verify a domain') || msg.includes('own email address')) {
        return res.status(500).json({
          error: 'Tu cuenta Resend está en modo de pruebas: solo puedes enviarte correos a ti mismo. '
               + 'Para enviar a cualquier cliente debes verificar tu dominio en resend.com/domains.',
        })
      }
      return res.status(500).json({ error: `Error Resend: ${msg}` })
    }

    const u = getUser(req)
    await log({
      userName: u.name, userEmail: u.email,
      action: 'crear', entity: 'Factura',
      entityId: order.id, entityName: `${order.orderNumber} → ${recipientEmail}`,
      details: `Enviada a ${recipientEmail}`,
    })

    res.json({ ok: true, message: `Factura enviada a ${recipientEmail}` })
  } catch (e) {
    res.status(500).json({ error: 'Error al enviar el correo: ' + e.message })
  }
})

// ── POST /api/email/test ──────────────────────────────────────────────────────
// Accepts either SMTP credentials (preferred) or a Resend API key. Tries SMTP
// first if provided, then falls back to Resend.
router.post('/test', async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, resendApiKey, testEmail } = req.body

  if (!testEmail) {
    return res.status(400).json({ error: 'Se requiere el correo de destino para la prueba' })
  }

  const subject = 'Prueba de configuración — Amazonia ERP'
  const text = '¡La configuración de correo está funcionando correctamente! Ya puedes enviar facturas por correo.'
  const html = `<p>${text}</p>`

  // ── 1) SMTP path ─────────────────────────────────────────────────────────
  if (smtpHost && smtpUser && smtpPass) {
    try {
      await sendViaSmtp({
        settings: { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, companyName: 'Amazonia ERP' },
        to: testEmail,
        subject,
        html,
        text,
      })
      return res.json({ ok: true, provider: 'smtp' })
    } catch (e) {
      const raw = e.message || String(e)
      let friendly = raw
      if (/ENOTFOUND|EAI_AGAIN/i.test(raw))
        friendly = `No se pudo conectar al servidor SMTP "${smtpHost}". Verifica el host.`
      else if (/ECONNREFUSED|ETIMEDOUT/i.test(raw))
        friendly = `Conexión rechazada por ${smtpHost}:${smtpPort || 587}. Verifica puerto y firewall.`
      else if (/Invalid login|535|EAUTH|Username and Password not accepted/i.test(raw))
        friendly = 'Usuario o contraseña SMTP incorrectos. Si usas Gmail, debes generar una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords (no funciona tu contraseña normal).'
      return res.status(500).json({ error: `Error SMTP: ${friendly}` })
    }
  }

  // ── 2) Resend fallback ───────────────────────────────────────────────────
  if (!resendApiKey) {
    return res.status(400).json({
      error: 'Configura SMTP (host + usuario + contraseña) o un API Key de Resend antes de probar.',
    })
  }
  try {
    const fromAddress = buildFromAddress('Amazonia ERP', smtpFrom)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddress, to: [testEmail], subject, text }),
    })
    const data = await response.json()
    if (!response.ok) {
      return res.status(500).json({ error: `Error Resend: ${data.message || JSON.stringify(data)}` })
    }
    res.json({ ok: true, provider: 'resend' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
