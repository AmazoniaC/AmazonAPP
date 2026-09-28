import jwt from 'jsonwebtoken'

// Sin JWT_SECRET no hay forma segura de firmar/verificar tokens: un valor por
// defecto conocido permitiría a cualquiera forjar un token válido como
// Administrador. Preferible que el servidor no arranque a que arranque
// "inseguro en silencio".
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET no está definido. Agrega una línea JWT_SECRET=<valor secreto largo> ' +
    'a tu archivo .env antes de arrancar el servidor (ver .env.example). ' +
    'Para generar uno: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  )
}

export function authMiddleware(req, res, next) {
  const publicPaths = [
    { method: 'POST', path: '/api/users/login' },
    { method: 'GET',  path: '/api/health' },
    { method: 'GET',  path: '/api/products' },
  ]

  const isPublic = publicPaths.some(
    (r) => req.method === r.method && req.path === r.path
  )
  if (isPublic) return next()

  // JWT from Authorization header
  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.authUser = decoded
      // Set x-user header so downstream getUser() keeps working
      if (!req.headers['x-user']) {
        req.headers['x-user'] = JSON.stringify({
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        })
      }
      return next()
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }
  }

  return res.status(401).json({ error: 'Se requiere autenticación' })
}

export { JWT_SECRET }
