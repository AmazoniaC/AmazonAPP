import { z } from 'zod'

// Only what a visitor can legitimately supply from the public catalog — never
// price or product name, which are always re-read from the database so a
// tampered client request can't set its own price.
export const createPublicOrderSchema = z.object({
  customerName: z.string().min(1, 'Nombre es requerido').max(200),
  customerPhone: z.string().min(5, 'Teléfono es requerido').max(30),
  customerEmail: z.string().email('Email inválido').max(200).nullish().or(z.literal('')),
  notes: z.string().max(1000).nullish(),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().nullish(),
    qty: z.number().positive().max(100000),
  })).min(1, 'El carrito está vacío').max(50),
})
