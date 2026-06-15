import { describe, it, expect } from 'vitest'
import { createProductionOrderSchema, updateProductionOrderStatusSchema } from '../../server/schemas/productionOrders.js'

describe('createProductionOrderSchema', () => {
  const valid = {
    id: 'po1',
    productId: 'p1',
    productName: 'Bloque 15cm',
    quantity: 500,
    unit: 'unidad',
  }

  it('accepts valid production order', () => {
    const result = createProductionOrderSchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('pending')
  })

  it('accepts full order with all fields', () => {
    const result = createProductionOrderSchema.safeParse({
      ...valid,
      status: 'in_progress',
      startDate: '2024-06-15',
      endDate: '2024-06-20',
      notes: 'Producción urgente',
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = createProductionOrderSchema.safeParse({ ...valid, quantity: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects missing productId', () => {
    const { productId, ...noProd } = valid
    const result = createProductionOrderSchema.safeParse(noProd)
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = createProductionOrderSchema.safeParse({ ...valid, status: 'ready' })
    expect(result.success).toBe(false)
  })
})

describe('updateProductionOrderStatusSchema', () => {
  it('accepts valid status', () => {
    const result = updateProductionOrderStatusSchema.safeParse({ status: 'finished' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = updateProductionOrderStatusSchema.safeParse({ status: 'ready' })
    expect(result.success).toBe(false)
  })

  it('rejects missing status', () => {
    const result = updateProductionOrderStatusSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
