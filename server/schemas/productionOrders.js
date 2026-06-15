import { z } from 'zod'

export const createProductionOrderSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  productId: z.string().min(1, 'Producto es requerido'),
  productName: z.string().min(1, 'Nombre del producto es requerido').max(200),
  quantity: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  unit: z.string().min(1, 'Unidad es requerida').max(20),
  status: z.enum(['pending', 'in_progress', 'finished', 'cancelled']).default('pending'),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  notes: z.string().max(2000).nullish(),
})

export const updateProductionOrderStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'finished', 'cancelled'], {
    required_error: 'Estado es requerido',
  }),
})
