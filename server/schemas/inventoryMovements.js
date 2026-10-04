import { z } from 'zod'

export const createInventoryMovementSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  itemId: z.string().min(1, 'Item es requerido'),
  itemName: z.string().min(1, 'Nombre del item es requerido').max(200),
  itemType: z.enum(['supply', 'product'], { required_error: 'Tipo de item es requerido' }),
  // 'production' and 'return' were added to the frontend's movementType
  // union (InventoryMovement in mockData.ts) and to MOVEMENT_META in
  // InventoryMovements.tsx long ago, but never added here — every call
  // logging one of those two was silently rejected (400) and swallowed by
  // a .catch(() => {}) at the call site, so finalizing a production order
  // never actually left a movement record despite the feature existing.
  movementType: z.enum(['entry', 'exit', 'adjustment', 'production', 'return'], { required_error: 'Tipo de movimiento es requerido' }),
  quantity: z.number().min(0, 'Cantidad debe ser positiva'),
  previousStock: z.number().min(0).default(0),
  newStock: z.number().min(0).default(0),
  unit: z.string().max(20).default('u'),
  reference: z.string().max(500).default(''),
  notes: z.string().max(2000).default(''),
})
