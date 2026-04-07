import { Router } from 'express'
import { getWhatsAppStatus, sendWhatsAppMessage, logoutWhatsApp, startWhatsApp } from '../whatsapp.js'

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

router.post('/send', async (req, res) => {
  const { phone, text } = req.body
  if (!phone || !text) return res.status(400).json({ error: 'phone y text son requeridos' })
  try {
    await sendWhatsAppMessage(phone, text)
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
