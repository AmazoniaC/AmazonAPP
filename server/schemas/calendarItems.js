import { z } from 'zod'

export const createCalendarItemSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  kind: z.string().default('meeting'),
  title: z.string().max(200).default(''),
  description: z.string().max(2000).default(''),
  location: z.string().max(200).default(''),
  date: z.string().min(1, 'Fecha es requerida'),
  time: z.string().default(''),
  reminderMinutes: z.number().min(0).default(15),
  notifyApp: z.boolean().default(true),
  notifyWhatsapp: z.boolean().default(false),
  whatsappPhone: z.string().max(30).default(''),
  done: z.boolean().default(false),
})

export const updateCalendarItemSchema = createCalendarItemSchema.omit({ id: true })
