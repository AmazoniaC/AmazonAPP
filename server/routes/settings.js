import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

const MASKED = '••••••••'

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT company_name AS "companyName", slogan, email, phone, address,
              currency, timezone, logo,
              bank_name           AS "bankName",
              bank_key            AS "bankKey",
              bank_account_type   AS "bankAccountType",
              bank_account_number AS "bankAccountNumber",
              bank_message        AS "bankMessage",
              tiktok, whatsapp, instagram,
              instagram_handle    AS "instagramHandle",
              smtp_host AS "smtpHost",
              smtp_port AS "smtpPort",
              smtp_user AS "smtpUser",
              smtp_pass AS "smtpPass",
              smtp_from AS "smtpFrom",
              resend_api_key AS "resendApiKey",
              invoice_prefix AS "invoicePrefix",
              monthly_goal AS "monthlyGoal"
       FROM settings WHERE id = 1`
    )
    const s = rows[0] ?? {}
    // Never expose secrets to the frontend — only indicate if they are set
    s.smtpPass    = s.smtpPass    ? MASKED : ''
    s.resendApiKey = s.resendApiKey ? MASKED : ''
    res.json(s)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/', async (req, res) => {
  const {
    companyName, slogan, email, phone, address, currency, timezone, logo,
    bankName, bankKey, bankAccountType, bankAccountNumber, bankMessage,
    tiktok, whatsapp, instagram, instagramHandle,
    smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, resendApiKey, invoicePrefix,
    monthlyGoal,
  } = req.body
  try {
    const { rows: existing } = await pool.query(
      `SELECT smtp_pass AS "smtpPass", resend_api_key AS "resendApiKey"
       FROM settings WHERE id = 1`
    )
    const prev = existing[0] || {}
    // Preserve secrets when frontend sends the masked placeholder or empty string
    const finalSmtpPass  = (smtpPass    && smtpPass    !== MASKED) ? smtpPass    : (prev.smtpPass    ?? '')
    const finalResendApi = (resendApiKey && resendApiKey !== MASKED) ? resendApiKey : (prev.resendApiKey ?? '')

    const { rows } = await pool.query(
      `INSERT INTO settings (
         id, company_name, slogan, email, phone, address, currency, timezone, logo,
         bank_name, bank_key, bank_account_type, bank_account_number, bank_message,
         tiktok, whatsapp, instagram, instagram_handle,
         smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, resend_api_key, invoice_prefix,
         monthly_goal
       )
       VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       ON CONFLICT (id) DO UPDATE SET
         company_name=$1, slogan=$2, email=$3, phone=$4, address=$5,
         currency=$6, timezone=$7, logo=$8,
         bank_name=$9, bank_key=$10, bank_account_type=$11,
         bank_account_number=$12, bank_message=$13,
         tiktok=$14, whatsapp=$15, instagram=$16, instagram_handle=$17,
         smtp_host=$18, smtp_port=$19, smtp_user=$20, smtp_pass=$21, smtp_from=$22,
         resend_api_key=$23, invoice_prefix=$24, monthly_goal=$25
       RETURNING *`,
      [
        companyName, slogan, email, phone, address, currency, timezone, logo ?? null,
        bankName ?? '', bankKey ?? '', bankAccountType ?? '',
        bankAccountNumber ?? '', bankMessage ?? '',
        tiktok ?? '', whatsapp ?? '', instagram ?? '', instagramHandle ?? '',
        smtpHost ?? '', smtpPort ?? 587, smtpUser ?? '', finalSmtpPass, smtpFrom ?? '',
        finalResendApi, invoicePrefix ?? 'VTA',
        monthlyGoal ?? 0,
      ]
    )
    const result = rows[0]
    result.smtp_pass = result.smtp_pass ? MASKED : ''
    result.resend_api_key = result.resend_api_key ? MASKED : ''
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Configuración', entityName: 'Datos de empresa' })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
