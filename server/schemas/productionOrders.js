import { z } from 'zod'

export const createProductionOrderSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  orderNumber: z.string().min(1, 'Número de orden es requerido'),
  recipe: z.string().min(1, 'Receta es requerida').max(200),
  recipeId: z.string().nullish(),
  product: z.string().min(1, 'Producto es requerido').max(200),
  plannedQty: z.number().min(0.01, 'Cantidad planeada debe ser mayor a 0'),
  status: z.enum(['pending', 'in_progress', 'finished', 'cancelled']).default('pending'),
  priority: z.number().int().min(1).max(5).default(3),
  plannedStart: z.string().nullish(),
  plannedEnd: z.string().nullish(),
  estimatedCost: z.number().min(0).default(0),
  assignedTo: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
})

export const updateProductionOrderStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'finished', 'cancelled'], {
    required_error: 'Estado es requerido',
  }),
})
