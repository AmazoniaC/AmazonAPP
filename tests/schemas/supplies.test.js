import { describe, it, expect } from 'vitest'
import { createSupplySchema, updateSupplySchema } from '../../server/schemas/supplies.js'

describe('createSupplySchema', () => {
  const valid = {
    id: 's1',
    name: 'Cemento Portland',
    category: 'Materia Prima',
    stock: 500,
    unit: 'kg',
    cost: 35000,
  }

  it('accepts valid supply', () => {
    const result = createSupplySchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts supply with optional fields', () => {
    const result = createSupplySchema.safeParse({
      ...valid,
      sku: 'CEM-001',
      minStock: 100,
      supplier: 'Argos',
      lastUpdate: '2024-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative stock', () => {
    const result = createSupplySchema.safeParse({ ...valid, stock: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects negative cost', () => {
    const result = createSupplySchema.safeParse({ ...valid, cost: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name, ...noName } = valid
    const result = createSupplySchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects empty category', () => {
    const result = createSupplySchema.safeParse({ ...valid, category: '' })
    expect(result.success).toBe(false)
  })
})

describe('updateSupplySchema', () => {
  it('accepts valid update without id', () => {
    const result = updateSupplySchema.safeParse({
      name: 'Cemento Gris',
      category: 'Materia Prima',
      stock: 600,
      unit: 'kg',
      cost: 36000,
    })
    expect(result.success).toBe(true)
  })
})
