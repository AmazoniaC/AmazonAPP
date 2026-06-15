import { ZodError } from 'zod'

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((e) => e.message)
        return res.status(400).json({ error: messages.join(', '), details: err.issues })
      }
      next(err)
    }
  }
}
