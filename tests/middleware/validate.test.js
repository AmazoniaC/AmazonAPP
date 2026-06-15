import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from '../../server/middleware/validate.js'

function mockReqRes(body) {
  const req = { body }
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
  }
  const next = vi.fn()
  return { req, res, next }
}

const testSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  age: z.number().min(0, 'Edad debe ser positiva'),
})

describe('validate middleware', () => {
  it('calls next() for valid data', () => {
    const { req, res, next } = mockReqRes({ name: 'Test', age: 25 })
    validate(testSchema)(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.body.name).toBe('Test')
  })

  it('applies defaults from schema parse', () => {
    const schemaWithDefault = z.object({
      name: z.string(),
      role: z.string().default('user'),
    })
    const { req, res, next } = mockReqRes({ name: 'Test' })
    validate(schemaWithDefault)(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.body.role).toBe('user')
  })

  it('returns 400 for invalid data', () => {
    const { req, res, next } = mockReqRes({ name: '', age: -1 })
    validate(testSchema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('Nombre es requerido')
    expect(res.body.details).toBeDefined()
  })

  it('returns 400 for missing fields', () => {
    const { req, res, next } = mockReqRes({})
    validate(testSchema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for wrong types', () => {
    const { req, res, next } = mockReqRes({ name: 'Test', age: 'twenty' })
    validate(testSchema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
  })

  it('includes all error messages joined', () => {
    const { req, res, next } = mockReqRes({})
    validate(testSchema)(req, res, next)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBeTruthy()
    expect(res.body.details.length).toBeGreaterThanOrEqual(2)
  })
})
