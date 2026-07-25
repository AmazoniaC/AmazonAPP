/**
 * seed.js – Crea las tablas y carga los datos iniciales en PostgreSQL.
 * Ejecutar una sola vez: npm run setup:db
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const { Pool } = pg

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'erp123',
  database: process.env.DB_NAME     || 'erp_amazonia',
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('📦 Creando tablas...')
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
    await client.query(schema)
    console.log('✅ Tablas creadas')

    // Verificar si ya hay datos para no duplicar
    const { rows } = await client.query('SELECT COUNT(*) FROM supplies')
    if (parseInt(rows[0].count) > 0) {
      console.log('ℹ️  La base de datos ya tiene datos. Seed omitido.')
      return
    }

    console.log('🌱 Insertando datos iniciales...')

    // Supplies  [id, sku, name, category, stock, min_stock, unit, cost, supplier]
    const supplies = [
      ['s1','INS-001','Harina de trigo','Harinas',45,20,'kg',1.20,'Molinos SA'],
      ['s2','INS-002','Azúcar blanca','Azúcares',32,15,'kg',0.90,'Dulcería Norte'],
      ['s3','INS-003','Mantequilla','Lácteos',8,10,'kg',4.50,'Lácteos del Sur'],
      ['s4','INS-004','Huevos','Proteínas',120,50,'u',0.18,'Granja El Sol'],
      ['s5','INS-005','Leche entera','Lácteos',20,10,'L',1.10,'Lácteos del Sur'],
      ['s6','INS-006','Cacao en polvo','Saborizantes',5,8,'kg',6.80,'CacaoShop'],
      ['s7','INS-007','Levadura seca','Leudantes',3,2,'kg',8.50,'BioLev'],
      ['s8','INS-008','Vainilla líquida','Saborizantes',500,200,'mL',0.03,'AromaShop'],
      ['s9','INS-009','Sal fina','Condimentos',12,5,'kg',0.40,'Salinera'],
      ['s10','INS-010','Aceite vegetal','Aceites',15,8,'L',2.20,'AceitesPro'],
    ]
    for (const s of supplies) {
      await client.query(
        `INSERT INTO supplies (id,sku,name,category,stock,min_stock,unit,cost,supplier)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        s
      )
    }

    // Products
    const products = [
      ['p1','Torta de chocolate','Tortas',28.00,11.20,12,'u',true],
      ['p2','Torta de vainilla','Tortas',25.00,9.80,8,'u',true],
      ['p3','Pan brioche (x12)','Panes',18.00,6.40,6,'doc',true],
      ['p4','Galletas mantequilla','Galletas',12.00,4.20,14,'kg',true],
      ['p5','Muffins de arándano','Muffins',3.50,1.10,24,'u',true],
      ['p6','Croissant artesanal','Panes',4.50,1.80,18,'u',true],
      ['p7','Cheesecake NY','Tortas',32.00,14.00,4,'u',true],
    ]
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id,name,category,price,cost,stock,unit,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
        p
      )
    }

    // Recipes
    const recipes = [
      ['r1','p1','Torta de chocolate',1,'u'],
      ['r2','p2','Torta de vainilla',1,'u'],
      ['r3','p3','Pan brioche (x12)',12,'u'],
    ]
    for (const r of recipes) {
      await client.query(
        `INSERT INTO recipes (id,product_id,product_name,yield,yield_unit)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        r
      )
    }

    const recipeIngredients = [
      ['r1','s1','Harina de trigo',0.4,'kg'],
      ['r1','s2','Azúcar blanca',0.3,'kg'],
      ['r1','s3','Mantequilla',0.2,'kg'],
      ['r1','s4','Huevos',4,'u'],
      ['r1','s6','Cacao en polvo',0.1,'kg'],
      ['r1','s5','Leche entera',0.2,'L'],
      ['r2','s1','Harina de trigo',0.4,'kg'],
      ['r2','s2','Azúcar blanca',0.25,'kg'],
      ['r2','s3','Mantequilla',0.18,'kg'],
      ['r2','s4','Huevos',3,'u'],
      ['r2','s8','Vainilla líquida',10,'mL'],
      ['r3','s1','Harina de trigo',0.5,'kg'],
      ['r3','s3','Mantequilla',0.1,'kg'],
      ['r3','s4','Huevos',2,'u'],
      ['r3','s7','Levadura seca',0.01,'kg'],
      ['r3','s5','Leche entera',0.1,'L'],
    ]
    for (const [rid, sid, sname, qty, unit] of recipeIngredients) {
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id,supply_id,supply_name,quantity,unit)
         VALUES ($1,$2,$3,$4,$5)`,
        [rid, sid, sname, qty, unit]
      )
    }

    // Production Orders
    const prodOrders = [
      ['po1','p1','Torta de chocolate',20,'u','finished','2024-11-01','2024-11-01'],
      ['po2','p3','Pan brioche (x12)',15,'doc','finished','2024-11-02','2024-11-02'],
      ['po3','p2','Torta de vainilla',10,'u','in_progress','2024-11-08','2024-11-08'],
      ['po4','p1','Torta de chocolate',25,'u','pending','2024-11-09','2024-11-09'],
      ['po5','p3','Pan brioche (x12)',20,'doc','pending','2024-11-10','2024-11-10'],
    ]
    for (const o of prodOrders) {
      await client.query(
        `INSERT INTO production_orders (id,product_id,product_name,quantity,unit,status,start_date,end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
        o
      )
    }

    // Customers
    // [id, name, email, phone, address, city, last_purchase, total_purchases, is_active, segment]
    const customers = [
      ['c1','Laura Martínez','laura@eventos.com','+57 310 1234567','','Bogotá','2024-01-15',4850,true,'mayorista'],
      ['c2','Pedro Sánchez','pedro@cafeteria.com','+57 311 2345678','','Medellín','2024-02-01',9200,true,'mayorista'],
      ['c3','Valentina Ríos','vale@gmail.com','+57 312 3456789','','Cali','2024-03-10',1200,true,'regular'],
      ['c4','Andrés Torres','andres@elpan.com','+57 313 4567890','','Bogotá','2024-01-20',6700,true,'mayorista'],
      ['c5','Sofía Herrera','sofia@outlook.com','+57 314 5678901','','Barranquilla','2024-04-05',850,true,'regular'],
      ['c6','Martín Castillo','mcastillo@hotel.com','+57 315 6789012','','Cartagena','2024-02-15',3400,true,'regular'],
    ]
    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (id,name,email,phone,address,city,last_purchase,total_purchases,is_active,segment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        c
      )
    }

    // Sale Orders
    const saleOrders = [
      ['so1','Laura Martínez','c1','2024-11-07','delivered','Transferencia',215,34.4,249.4],
      ['so2','Pedro Sánchez','c2','2024-11-07','processing','Efectivo',240,38.4,278.4],
      ['so3','Valentina Ríos','c3','2024-11-06','confirmed','Tarjeta',42,6.72,48.72],
      ['so4','Andrés Torres','c4','2024-11-08','pending','Transferencia',252,40.32,292.32],
      ['so5','Martín Castillo','c6','2024-11-05','confirmed','Tarjeta',152,24.32,176.32],
      ['so6','Sofía Herrera','c5','2024-11-04','delivered','Efectivo',24,3.84,27.84],
    ]
    for (const o of saleOrders) {
      await client.query(
        `INSERT INTO sale_orders (id,customer_name,customer_id,date,status,payment_method,subtotal,tax,total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        o
      )
    }

    // Sale Order Items
    const items = [
      ['so1','p1','Torta de chocolate',5,28,140],
      ['so1','p2','Torta de vainilla',3,25,75],
      ['so2','p3','Pan brioche (x12)',10,18,180],
      ['so2','p4','Galletas mantequilla',5,12,60],
      ['so3','p5','Muffins de arándano',12,3.5,42],
      ['so4','p6','Croissant artesanal',24,4.5,108],
      ['so4','p3','Pan brioche (x12)',8,18,144],
      ['so5','p7','Cheesecake NY',3,32,96],
      ['so5','p1','Torta de chocolate',2,28,56],
      ['so6','p4','Galletas mantequilla',2,12,24],
    ]
    for (const i of items) {
      await client.query(
        `INSERT INTO sale_order_items (order_id,product_id,product_name,quantity,unit_price,subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        i
      )
    }

    console.log('✅ Datos iniciales cargados correctamente')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
