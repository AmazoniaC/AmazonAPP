import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

// DELETE /api/reset  – wipes all business data and settings
router.delete('/', async (req, res) => {
  const u = getUser(req)
  try {
    // audit_log is deliberately NOT in this list: it's the compliance record
    // of what happened, including this reset itself, so it must survive it.
    // (It used to be truncated here too, which silently erased the very log
    // entry written just below, defeating the point of logging the reset.)
    await pool.query(`
      TRUNCATE TABLE
        sale_order_items,
        recipe_ingredients,
        inventory_movements,
        customer_activities,
        quotations,
        purchase_orders,
        dispatches,
        expenses,
        opportunities,
        price_lists,
        payments,
        suppliers,
        returns,
        calendar_items,
        supplies,
        products,
        production_orders,
        customers,
        sale_orders,
        recipes,
        settings
      RESTART IDENTITY CASCADE
    `)
    await log({ userName: u.name, userEmail: u.email, action: 'restablecer', entity: 'Sistema', entityName: 'Restablecimiento de fábrica', details: 'Todos los datos fueron eliminados' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
