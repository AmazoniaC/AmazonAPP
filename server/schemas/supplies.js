import { z } from 'zod'

export const createSupplySchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  name: z.string().min(1, 'Nombre es requerido').max(200),
  category: z.string().min(1, 'Categoría es requerida').max(100),
  stock: z.number().min(0, 'Stock debe ser positivo'),
  minStock: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unidad es requerida').max(20),
  cost: z.number().min(0, 'Costo debe ser positivo'),
  sku: z.string().max(50).nullish(),
  supplier: z.string().max(200).nullish(),
  lastUpdate: z.string().nullish(),
})

export const updateSupplySchema = createSupplySchema.omit({ id: true })
