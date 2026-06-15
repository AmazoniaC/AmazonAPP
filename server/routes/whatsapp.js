import { Router } from 'express'
import { getWhatsAppStatus, sendWhatsAppMessage, logoutWhatsApp, startWhatsApp } from '../whatsapp.js'
import { validate } from '../middleware/validate.js'
import { sendWhatsAppSchema } from '../schemas/whatsapp.js'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getWhatsAppStatus())
})

router.post('/connect', async (_req, res) => {
  try {
    await startWhatsApp()
    res.json(getWhatsAppStatus())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/logout', async (_req, res) => {
  try {
    await logoutWhatsApp()
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/send', validate(sendWhatsAppSchema), async (req, res) => {
  const { phone, text } = req.body
  try {
    await sendWhatsAppMessage(phone, text)
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// POST /api/whatsapp/test — diagnostic endpoint to verify WhatsApp delivery
// end-to-end from the UI. Returns the current connection status alongside the
// send result so the user can see exactly what's wrong.
router.post('/test', validate(sendWhatsAppSchema), async (req, res) => {
  const { phone, text } = req.body
  const status = getWhatsAppStatus()
  try {
    await sendWhatsAppMessage(phone, text)
    res.json({ ok: true, status: status.status })
  } catch (e) {
    res.status(400).json({ error: e.message, status: status.status, lastError: status.error })
  }
})

export default router
