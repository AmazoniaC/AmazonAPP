import { describe, it, expect } from 'vitest'
import { createProductSchema, updateProductSchema } from '../../server/schemas/products.js'

describe('createProductSchema', () => {
  const valid = {
    id: 'p1',
    name: 'Bloque 15cm',
    category: 'Bloques',
    price: 2500,
    cost: 1800,
    stock: 100,
    unit: 'unidad',
  }

  it('accepts valid product with defaults', () => {
    const result = createProductSchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.isActive).toBe(true)
    expect(result.data.variants).toEqual([])
    expect(result.data.sku).toBe('')
  })

  it('accepts product with variants', () => {
    const result = createProductSchema.safeParse({
      ...valid,
      variants: [
        { id: 'v1', color: 'Gris', acabado: 'Natural', price: 2500, stock: 50 },
        { id: 'v2', color: 'Rojo', acabado: 'Pulido', price: 3000, stock: 30 },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data.variants).toHaveLength(2)
  })

  it('rejects negative price', () => {
    const result = createProductSchema.safeParse({ ...valid, price: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects negative cost', () => {
    const result = createProductSchema.safeParse({ ...valid, cost: -50 })
    expect(result.success).toBe(false)
  })

  it('rejects missing category', () => {
    const { category, ...noCategory } = valid
    const result = createProductSchema.safeParse(noCategory)
    expect(result.success).toBe(false)
  })

  it('rejects missing unit', () => {
    const { unit, ...noUnit } = valid
    const result = createProductSchema.safeParse(noUnit)
    expect(result.success).toBe(false)
  })
})

describe('updateProductSchema', () => {
  it('accepts valid update without id', () => {
    const result = updateProductSchema.safeParse({
      name: 'Bloque 20cm',
      category: 'Bloques',
      price: 3500,
      cost: 2500,
      stock: 200,
      unit: 'unidad',
    })
    expect(result.success).toBe(true)
  })
})
