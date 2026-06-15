import { describe, it, expect, vi } from 'vitest'

function createErrorHandler() {
  return (err, req, res, _next) => {
    const status = err.status || err.statusCode || 500
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message })
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
  }
  return res
}

describe('global error handler', () => {
  const handler = createErrorHandler()

  it('returns 500 with generic message for unhandled errors', () => {
    const res = mockRes()
    handler(new Error('db crashed'), { method: 'GET', path: '/api/test' }, res, () => {})
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe('Error interno del servidor')
  })

  it('uses err.status if provided', () => {
    const err = new Error('Not found')
    err.status = 404
    const res = mockRes()
    handler(err, { method: 'GET', path: '/api/test' }, res, () => {})
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('Not found')
  })

  it('uses err.statusCode if provided', () => {
    const err = new Error('Forbidden')
    err.statusCode = 403
    const res = mockRes()
    handler(err, { method: 'POST', path: '/api/test' }, res, () => {})
    expect(res.statusCode).toBe(403)
    expect(res.body.error).toBe('Forbidden')
  })

  it('hides internal error details from 500 responses', () => {
    const err = new Error('SELECT * FROM secret_table failed')
    const res = mockRes()
    handler(err, { method: 'GET', path: '/api/test' }, res, () => {})
    expect(res.body.error).not.toContain('secret_table')
    expect(res.body.error).toBe('Error interno del servidor')
  })
})
