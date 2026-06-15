import { z } from 'zod'

export const createCustomerSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  name: z.string().min(1, 'Nombre es requerido').max(200),
  code: z.string().max(50).nullish(),
  company: z.string().max(200).nullish(),
  email: z.string().email('Email inválido').nullish().or(z.literal('')),
  phone: z.string().max(30).nullish(),
  city: z.string().max(100).nullish(),
  segment: z.enum(['regular', 'mayorista', 'vip']).default('regular'),
  totalPurchases: z.number().min(0).default(0),
  lastPurchase: z.string().nullish(),
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).nullish(),
  priceListId: z.string().nullish(),
  defaultDiscount: z.number().min(0).max(100).default(0),
})

export const updateCustomerSchema = createCustomerSchema.omit({ id: true })
