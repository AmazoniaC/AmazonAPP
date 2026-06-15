import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool }   from '../db.js'
import { log, getUser } from '../audit.js'
import { JWT_SECRET } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, createUserSchema, updateUserSchema } from '../schemas/users.js'

const SALT_ROUNDS = 10
const router = Router()

// ── Helper: hash existing plaintext passwords on first startup ──────────────
// Runs once when the module loads. Passwords that are already bcrypt hashes
// (starting with "$2b$" or "$2a$") are left untouched.
async function hashExistingPasswords() {
  try {
    const { rows } = await pool.query('SELECT id, password FROM users')
    for (const row of rows) {
      if (row.password && !row.password.startsWith('$2b$') && !row.password.startsWith('$2a$')) {
        const hashed = await bcrypt.hash(row.password, SALT_ROUNDS)
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, row.id])
      }
    }
    console.log('✅ Existing passwords hashed')
  } catch (e) {
    console.error('⚠️  Password migration error:', e.message)
  }
}
// Delay slightly so DB migrations in index.js run first
setTimeout(hashExistingPasswords, 3000)

// ── POST /api/users/login ─────────────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, password, role, is_active AS "isActive"
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    const user = rows[0]
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Return same shape as before, plus token
    const { password: _pw, ...safeUser } = user
    res.json({ ...safeUser, token })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/users ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role,
              is_active AS "isActive",
              to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
       FROM users ORDER BY name`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/users ───────────────────────────────────────────────────────────
router.post('/', validate(createUserSchema), async (req, res) => {
  const { id, name, email, password, role, isActive } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password, role, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, role,
                 is_active AS "isActive",
                 to_char(created_at,'YYYY-MM-DD') AS "createdAt"`,
      [id, name, email, hashedPassword, role ?? 'Ventas', isActive ?? true]
    )
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Usuario', entityId: id, entityName: name })
    res.status(201).json(rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
    res.status(500).json({ error: e.message })
  }
})

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
router.put('/:id', validate(updateUserSchema), async (req, res) => {
  const { name, email, password, role, isActive } = req.body
  try {
    let rows
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
      ;({ rows } = await pool.query(
        `UPDATE users SET name=$1, email=$2, password=$3, role=$4, is_active=$5
         WHERE id=$6
         RETURNING id, name, email, role,
                   is_active AS "isActive",
                   to_char(created_at,'YYYY-MM-DD') AS "createdAt"`,
        [name, email, hashedPassword, role, isActive ?? true, req.params.id]
      ))
    } else {
      ;({ rows } = await pool.query(
        `UPDATE users SET name=$1, email=$2, role=$3, is_active=$4
         WHERE id=$5
         RETURNING id, name, email, role,
                   is_active AS "isActive",
                   to_char(created_at,'YYYY-MM-DD') AS "createdAt"`,
        [name, email, role, isActive ?? true, req.params.id]
      ))
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'editar', entity: 'Usuario', entityId: req.params.id, entityName: name })
    res.json(rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM users WHERE id=$1 RETURNING name', [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Usuario', entityId: req.params.id, entityName: rows[0].name })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
