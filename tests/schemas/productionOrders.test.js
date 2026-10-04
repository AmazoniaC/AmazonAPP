import { describe, it, expect } from 'vitest'
import { createProductionOrderSchema, updateProductionOrderStatusSchema } from '../../server/schemas/productionOrders.js'

describe('createProductionOrderSchema', () => {
  const valid = {
    id: 'po1',
    orderNumber: 'OP-2026-0001',
    recipe: 'Bloque 15cm',
    product: 'Bloque 15cm',
    plannedQty: 500,
  }

  it('accepts valid production order', () => {
    const result = createProductionOrderSchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('pending')
    expect(result.data.priority).toBe(3)
  })

  it('accepts full order with all fields', () => {
    const result = createProductionOrderSchema.safeParse({
      ...valid,
      recipeId: 'rec1',
      status: 'in_progress',
      priority: 1,
      plannedStart: '2024-06-15 08:00',
      plannedEnd: '2024-06-20 16:00',
      estimatedCost: 150000,
      assignedTo: 'Carlos Mendez',
      notes: 'Producción urgente',
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero plannedQty', () => {
    const result = createProductionOrderSchema.safeParse({ ...valid, plannedQty: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects missing product', () => {
    const { product, ...noProduct } = valid
    const result = createProductionOrderSchema.safeParse(noProduct)
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = createProductionOrderSchema.safeParse({ ...valid, status: 'ready' })
    expect(result.success).toBe(false)
  })

  it('rejects priority out of range', () => {
    const result = createProductionOrderSchema.safeParse({ ...valid, priority: 6 })
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
