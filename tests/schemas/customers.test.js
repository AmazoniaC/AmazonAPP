import { describe, it, expect } from 'vitest'
import { createCustomerSchema, updateCustomerSchema } from '../../server/schemas/customers.js'

describe('createCustomerSchema', () => {
  const valid = { id: 'c1', name: 'Juan Pérez' }

  it('accepts minimal valid customer', () => {
    const result = createCustomerSchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.segment).toBe('regular')
    expect(result.data.isActive).toBe(true)
    expect(result.data.totalPurchases).toBe(0)
    expect(result.data.defaultDiscount).toBe(0)
  })

  it('accepts full customer data', () => {
    const result = createCustomerSchema.safeParse({
      ...valid,
      code: 'CLI-001',
      company: 'Empresa SA',
      email: 'juan@empresa.com',
      phone: '3001234567',
      city: 'Bogotá',
      segment: 'vip',
      totalPurchases: 1500000,
      isActive: true,
      notes: 'Cliente preferencial',
      defaultDiscount: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createCustomerSchema.safeParse({ id: 'c1' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid segment', () => {
    const result = createCustomerSchema.safeParse({ ...valid, segment: 'premium' })
    expect(result.success).toBe(false)
  })

  it('rejects negative discount', () => {
    const result = createCustomerSchema.safeParse({ ...valid, defaultDiscount: -5 })
    expect(result.success).toBe(false)
  })

  it('rejects discount over 100', () => {
    const result = createCustomerSchema.safeParse({ ...valid, defaultDiscount: 150 })
    expect(result.success).toBe(false)
  })

  it('accepts null optional fields', () => {
    const result = createCustomerSchema.safeParse({ ...valid, email: null, phone: null, city: null })
    expect(result.success).toBe(true)
  })
})

describe('updateCustomerSchema', () => {
  it('accepts valid update (no id required)', () => {
    const result = updateCustomerSchema.safeParse({ name: 'Updated Name' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateCustomerSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
