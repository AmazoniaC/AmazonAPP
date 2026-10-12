import { z } from 'zod'

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  attributes: z.object({ color: z.string().optional(), acabado: z.string().optional() }).passthrough().default({}),
  priceOverride: z.number().min(0).optional(),
  costOverride: z.number().min(0).optional(),
  stock: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
}).passthrough()

export const createProductSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  name: z.string().min(1, 'Nombre es requerido').max(200),
  category: z.string().min(1, 'Categoría es requerida').max(100),
  price: z.number().min(0, 'Precio debe ser positivo'),
  cost: z.number().min(0, 'Costo debe ser positivo'),
  stock: z.number().min(0),
  unit: z.string().min(1, 'Unidad es requerida').max(20),
  sku: z.string().max(50).default(''),
  description: z.string().max(2000).default(''),
  image: z.string().default(''),
  recipeId: z.string().default(''),
  isActive: z.boolean().default(true),
  showInCatalog: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  variants: z.array(variantSchema).default([]),
})

export const updateProductSchema = createProductSchema.omit({ id: true })
