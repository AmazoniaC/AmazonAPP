import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// Read-only summary of the anonymous counters written by the public
// /api/public/analytics/* beacons — shown in Configuración → Catálogo
// público so the owner can see traffic without any external service.
router.get('/', async (_req, res) => {
  try {
    const [{ rows: totalRows }, { rows: last30Rows }, { rows: viewsRows }, { rows: topRows }] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM catalog_visits'),
      pool.query(`SELECT COUNT(*)::int AS total FROM catalog_visits WHERE visited_at >= NOW() - INTERVAL '30 days'`),
      pool.query('SELECT COUNT(*)::int AS total FROM catalog_product_views'),
      pool.query(`
        SELECT v.product_id AS "productId", p.name, COUNT(*)::int AS views
        FROM catalog_product_views v
        LEFT JOIN products p ON p.id = v.product_id
        GROUP BY v.product_id, p.name
        ORDER BY views DESC
        LIMIT 5
      `),
    ])
    res.json({
      totalVisits: totalRows[0].total,
      visitsLast30Days: last30Rows[0].total,
      totalProductViews: viewsRows[0].total,
      topProducts: topRows.map((r) => ({
        productId: r.productId,
        name: r.name ?? '(producto eliminado)',
        views: r.views,
      })),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
