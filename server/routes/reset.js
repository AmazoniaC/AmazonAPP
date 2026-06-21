import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

// DELETE /api/reset  – wipes all business data and settings
router.delete('/', async (req, res) => {
  const u = getUser(req)
  // Log BEFORE truncate so the record survives the cascade
  await log({ userName: u.name, userEmail: u.email, action: 'restablecer', entity: 'Sistema', entityName: 'Restablecimiento de fábrica', details: 'Todos los datos fueron eliminados' })
  try {
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
        audit_log,
        supplies,
        products,
        production_orders,
        customers,
        sale_orders,
        recipes,
        settings
      RESTART IDENTITY CASCADE
    `)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
