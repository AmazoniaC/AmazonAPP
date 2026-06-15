import { describe, it, expect } from 'vitest'
import { createSaleOrderSchema, updateSaleOrderSchema } from '../../server/schemas/saleOrders.js'

describe('createSaleOrderSchema', () => {
  const valid = {
    id: 'so1',
    customer: 'Juan Pérez',
    date: '2024-06-15',
  }

  it('accepts minimal valid order', () => {
    const result = createSaleOrderSchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('pending')
    expect(result.data.paymentStatus).toBe('pending')
    expect(result.data.items).toEqual([])
  })

  it('accepts full order with items', () => {
    const result = createSaleOrderSchema.safeParse({
      ...valid,
      orderNumber: 'VTA-001',
      customerId: 'c1',
      paymentMethod: 'Transferencia',
      subtotal: 100000,
      discount: 5000,
      tax: 19000,
      total: 114000,
      items: [
        { productId: 'p1', product: 'Bloque', qty: 100, price: 1000, subtotal: 100000 },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data.items).toHaveLength(1)
  })

  it('rejects missing customer', () => {
    const result = createSaleOrderSchema.safeParse({ id: 'so1', date: '2024-01-01' })
    expect(result.success).toBe(false)
  })

  it('rejects missing date', () => {
    const result = createSaleOrderSchema.safeParse({ id: 'so1', customer: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = createSaleOrderSchema.safeParse({ ...valid, status: 'shipped' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid payment status', () => {
    const result = createSaleOrderSchema.safeParse({ ...valid, paymentStatus: 'overdue' })
    expect(result.success).toBe(false)
  })

  it('rejects negative total', () => {
    const result = createSaleOrderSchema.safeParse({ ...valid, total: -1000 })
    expect(result.success).toBe(false)
  })
})

describe('updateSaleOrderSchema', () => {
  it('accepts valid status update', () => {
    const result = updateSaleOrderSchema.safeParse({ status: 'completed' })
    expect(result.success).toBe(true)
  })

  it('accepts valid payment status update', () => {
    const result = updateSaleOrderSchema.safeParse({ paymentStatus: 'paid' })
    expect(result.success).toBe(true)
  })

  it('accepts empty update (all optional)', () => {
    const result = updateSaleOrderSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid status value', () => {
    const result = updateSaleOrderSchema.safeParse({ status: 'shipped' })
    expect(result.success).toBe(false)
  })
})
