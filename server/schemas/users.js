import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña es requerida'),
})

export const createUserSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  name: z.string().min(1, 'Nombre es requerido').max(200),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['Administrador', 'Producción', 'Ventas', 'Inventario', 'Contabilidad']).default('Ventas'),
  isActive: z.boolean().default(true),
})

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(200),
  email: z.string().email('Email inválido'),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['Administrador', 'Producción', 'Ventas', 'Inventario', 'Contabilidad']).optional(),
  isActive: z.boolean().default(true),
})
