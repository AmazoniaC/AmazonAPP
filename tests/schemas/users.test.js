import { describe, it, expect } from 'vitest'
import { loginSchema, createUserSchema, updateUserSchema } from '../../server/schemas/users.js'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'admin@empresa.com', password: 'admin123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '123456' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'admin@empresa.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
  })
})

describe('createUserSchema', () => {
  const validUser = {
    id: 'u99',
    name: 'Test User',
    email: 'test@empresa.com',
    password: 'secret123',
  }

  it('accepts valid user with defaults', () => {
    const result = createUserSchema.safeParse(validUser)
    expect(result.success).toBe(true)
    expect(result.data.role).toBe('Ventas')
    expect(result.data.isActive).toBe(true)
  })

  it('accepts valid user with explicit role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'Administrador' })
    expect(result.success).toBe(true)
    expect(result.data.role).toBe('Administrador')
  })

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'SuperAdmin' })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = createUserSchema.safeParse({ ...validUser, password: '123' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name, ...noName } = validUser
    const result = createUserSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects missing id', () => {
    const { id, ...noId } = validUser
    const result = createUserSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })
})

describe('updateUserSchema', () => {
  it('accepts update without password', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated Name',
      email: 'updated@empresa.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts update with empty password (no change)', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated Name',
      email: 'updated@empresa.com',
      password: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects update with too short password', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated Name',
      email: 'updated@empresa.com',
      password: '12',
    })
    expect(result.success).toBe(false)
  })
})
