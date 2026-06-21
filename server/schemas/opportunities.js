import { z } from 'zod'

export const createOpportunitySchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  title: z.string().min(1, 'Título es requerido').max(200),
  customerId: z.string().default(''),
  customer: z.string().default(''),
  stage: z.string().default('lead'),
  value: z.number().min(0).default(0),
  probability: z.number().min(0).max(100).default(50),
  expectedClose: z.string().nullish(),
  assignedTo: z.string().default(''),
  quotationId: z.string().default(''),
  notes: z.string().max(2000).default(''),
  lostReason: z.string().max(500).default(''),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
})

export const updateOpportunitySchema = createOpportunitySchema.omit({ id: true, createdAt: true })
