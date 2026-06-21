import { Router } from 'express'
import { pool } from '../db.js'
import { log, getUser } from '../audit.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { rows: recipes } = await pool.query(
      `SELECT id, product_id AS "productId", product_name AS "name",
              yield::float AS "yieldQty", yield_unit AS "yieldUnit",
              prep_time AS "prepTime", notes
       FROM recipes ORDER BY product_name`
    )
    const { rows: ingredients } = await pool.query(
      `SELECT recipe_id AS "recipeId", supply_id AS "supplyId", supply_name AS "supplyName",
              quantity::float AS "qty", unit, cost::float
       FROM recipe_ingredients`
    )
    const ingByRecipe = ingredients.reduce((acc, ing) => {
      if (!acc[ing.recipeId]) acc[ing.recipeId] = []
      acc[ing.recipeId].push(ing)
      return acc
    }, {})
    res.json(recipes.map((r) => {
      const ings = (ingByRecipe[r.id] ?? []).map((i) => ({ ...i, cost: i.cost ?? 0 }))
      const totalCost = ings.reduce((a, i) => a + i.cost, 0)
      const costPerUnit = r.yieldQty > 0 ? totalCost / r.yieldQty : 0
      return { ...r, ingredients: ings, totalCost, costPerUnit }
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  const { id, productId, name, yieldQty, yieldUnit, prepTime, notes, ingredients } = req.body
  if (!name) return res.status(400).json({ error: 'name es requerido' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO recipes (id, product_id, product_name, yield, yield_unit, prep_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, productId ?? '', name, yieldQty ?? 1, yieldUnit ?? 'u', prepTime ?? 0, notes ?? null]
    )
    if (ingredients?.length) {
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, supply_id, supply_name, quantity, unit, cost)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, ing.supplyId ?? '', ing.supplyName ?? '', ing.qty ?? 0, ing.unit ?? 'u', ing.cost ?? 0]
        )
      }
    }
    await client.query('COMMIT')
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'crear', entity: 'Receta', entityId: id, entityName: name })
    res.status(201).json({ id })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id=$1', [req.params.id])
    const { rows } = await pool.query('DELETE FROM recipes WHERE id=$1 RETURNING product_name AS "name"', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    const u = getUser(req)
    await log({ userName: u.name, userEmail: u.email, action: 'eliminar', entity: 'Receta', entityId: req.params.id, entityName: rows[0].name })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
