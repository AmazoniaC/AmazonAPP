import { z } from 'zod'

const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  quantity: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
}).passthrough()

export const createQuotationSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  quoteNumber: z.string().min(1, 'Número de cotización es requerido'),
  customer: z.string().min(1, 'Cliente es requerido'),
  customerId: z.string().default(''),
  items: z.array(itemSchema).default([]),
  subtotal: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  status: z.string().default('draft'),
  validUntil: z.string().nullish(),
  date: z.string().nullish(),
  deliveryEstimate: z.string().default(''),
  notes: z.string().max(2000).default(''),
  internalNotes: z.string().max(2000).default(''),
  convertedToOrderId: z.string().default(''),
})

export const updateQuotationSchema = createQuotationSchema.omit({ id: true })
