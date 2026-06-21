import { z } from 'zod'

export const createExpenseSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  date: z.string().min(1, 'Fecha es requerida'),
  category: z.string().default('Otros'),
  description: z.string().max(2000).default(''),
  amount: z.number().min(0).default(0),
  beneficiary: z.string().max(200).default(''),
  paymentMethod: z.string().default('Transferencia'),
  notes: z.string().max(2000).default(''),
  recurring: z.boolean().default(false),
  period: z.string().default('once'),
})

export const updateExpenseSchema = createExpenseSchema.omit({ id: true })
