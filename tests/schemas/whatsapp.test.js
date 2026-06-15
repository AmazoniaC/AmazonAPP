import { describe, it, expect } from 'vitest'
import { sendWhatsAppSchema } from '../../server/schemas/whatsapp.js'

describe('sendWhatsAppSchema', () => {
  it('accepts valid phone and text', () => {
    const result = sendWhatsAppSchema.safeParse({ phone: '573001234567', text: 'Hola' })
    expect(result.success).toBe(true)
  })

  it('rejects phone too short', () => {
    const result = sendWhatsAppSchema.safeParse({ phone: '1234', text: 'Hola' })
    expect(result.success).toBe(false)
  })

  it('rejects empty text', () => {
    const result = sendWhatsAppSchema.safeParse({ phone: '573001234567', text: '' })
    expect(result.success).toBe(false)
  })

  it('rejects text over 4000 chars', () => {
    const result = sendWhatsAppSchema.safeParse({
      phone: '573001234567',
      text: 'a'.repeat(4001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = sendWhatsAppSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
