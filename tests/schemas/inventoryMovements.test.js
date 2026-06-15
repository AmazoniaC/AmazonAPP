import { describe, it, expect } from 'vitest'
import { createInventoryMovementSchema } from '../../server/schemas/inventoryMovements.js'

describe('createInventoryMovementSchema', () => {
  const valid = {
    id: 'im1',
    itemId: 's1',
    itemName: 'Cemento',
    itemType: 'supply',
    movementType: 'entry',
    quantity: 100,
  }

  it('accepts valid movement with defaults', () => {
    const result = createInventoryMovementSchema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data.previousStock).toBe(0)
    expect(result.data.newStock).toBe(0)
    expect(result.data.unit).toBe('u')
  })

  it('accepts full movement data', () => {
    const result = createInventoryMovementSchema.safeParse({
      ...valid,
      previousStock: 400,
      newStock: 500,
      unit: 'kg',
      reference: 'OC-001',
      notes: 'Compra semanal',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid itemType', () => {
    const result = createInventoryMovementSchema.safeParse({ ...valid, itemType: 'material' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid movementType', () => {
    const result = createInventoryMovementSchema.safeParse({ ...valid, movementType: 'transfer' })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = createInventoryMovementSchema.safeParse({ ...valid, quantity: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects missing itemId', () => {
    const { itemId, ...noItem } = valid
    const result = createInventoryMovementSchema.safeParse(noItem)
    expect(result.success).toBe(false)
  })

  it('rejects missing itemName', () => {
    const { itemName, ...noName } = valid
    const result = createInventoryMovementSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })
})
