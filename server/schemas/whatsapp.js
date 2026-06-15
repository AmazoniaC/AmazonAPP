import { z } from 'zod'

export const sendWhatsAppSchema = z.object({
  phone: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos').max(20),
  text: z.string().min(1, 'Mensaje es requerido').max(4000, 'Mensaje muy largo (máx. 4000 caracteres)'),
})
