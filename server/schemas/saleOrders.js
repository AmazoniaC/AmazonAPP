import { z } from 'zod'

const saleOrderItemSchema = z.object({
  productId: z.string().default(''),
  product: z.string().optional(),
  productName: z.string().optional(),
  qty: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  discount: z.number().min(0).default(0),
  subtotal: z.number().min(0).default(0),
}).passthrough()

export const createSaleOrderSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  customer: z.string().min(1, 'Cliente es requerido'),
  orderNumber: z.string().nullish(),
  customerId: z.string().nullish(),
  date: z.string().min(1, 'Fecha es requerida'),
  status: z.enum(['pending', 'confirmed', 'processing', 'completed', 'cancelled']).default('pending'),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded']).default('pending'),
  paymentMethod: z.string().nullish(),
  subtotal: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  notes: z.string().max(2000).nullish(),
  items: z.array(saleOrderItemSchema).default([]),
  priceListId: z.string().nullish(),
})

export const updateSaleOrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'completed', 'cancelled']).nullish(),
  paymentMethod: z.string().nullish(),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded']).nullish(),
})
