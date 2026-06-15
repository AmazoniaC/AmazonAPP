import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { pool } from './db.js'
import { authMiddleware } from './middleware/auth.js'
import usersRouter          from './routes/users.js'
import emailRouter          from './routes/email.js'
import suppliesRouter       from './routes/supplies.js'
import productsRouter       from './routes/products.js'
import productionOrdersRouter from './routes/productionOrders.js'
import customersRouter      from './routes/customers.js'
import saleOrdersRouter     from './routes/saleOrders.js'
import recipesRouter        from './routes/recipes.js'
import settingsRouter       from './routes/settings.js'
import resetRouter          from './routes/reset.js'
import auditLogRouter       from './routes/auditLog.js'
import quotationsRouter          from './routes/quotations.js'
import customerActivitiesRouter  from './routes/customerActivities.js'
import purchaseOrdersRouter      from './routes/purchaseOrders.js'
import dispatchesRouter          from './routes/dispatches.js'
import expensesRouter            from './routes/expenses.js'
import opportunitiesRouter       from './routes/opportunities.js'
import priceListsRouter          from './routes/priceLists.js'
import importRouter              from './routes/import.js'
import returnsRouter             from './routes/returns.js'
import suppliersRouter           from './routes/suppliers.js'
import paymentsRouter            from './routes/payments.js'
import inventoryMovementsRouter  from './routes/inventoryMovements.js'
import calendarItemsRouter       from './routes/calendarItems.js'
import whatsappRouter            from './routes/whatsapp.js'
import { startWhatsApp }         from './whatsapp.js'
import { startScheduler }        from './scheduler.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001

// ── Run DB migrations on startup ───────────────────────────────────────────
async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS code            TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS company         TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment         TEXT DEFAULT 'regular';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_purchases NUMERIC DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_purchase   DATE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes           TEXT;
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS order_number   TEXT;
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS cost NUMERIC NOT NULL DEFAULT 0;
      ALTER TABLE supplies ADD COLUMN IF NOT EXISTS sku TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_name          TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_key           TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account_type  TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_message       TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS tiktok             TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp           TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram          TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_handle   TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_host     TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_port     INTEGER DEFAULT 587;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_user     TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_pass     TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_from          TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS resend_api_key     TEXT DEFAULT '';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_prefix     TEXT DEFAULT 'VTA';
      ALTER TABLE products   ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE products   ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '';
      ALTER TABLE products   ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT '';
      ALTER TABLE products   ADD COLUMN IF NOT EXISTS recipe_id TEXT DEFAULT '';
      ALTER TABLE products   ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';
      CREATE TABLE IF NOT EXISTS quotations (
        id                    TEXT PRIMARY KEY,
        quote_number          TEXT,
        customer              TEXT NOT NULL,
        customer_id           TEXT DEFAULT '',
        items                 JSONB NOT NULL DEFAULT '[]',
        subtotal              NUMERIC(12,2) DEFAULT 0,
        tax                   NUMERIC(12,2) DEFAULT 0,
        total                 NUMERIC(12,2) DEFAULT 0,
        status                TEXT NOT NULL DEFAULT 'draft',
        valid_until           DATE,
        date                  DATE,
        delivery_estimate     TEXT DEFAULT '',
        notes                 TEXT DEFAULT '',
        internal_notes        TEXT DEFAULT '',
        converted_to_order_id TEXT DEFAULT '',
        created_at            TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id            TEXT PRIMARY KEY,
        order_number  TEXT,
        supplier      TEXT NOT NULL DEFAULT '',
        status        TEXT NOT NULL DEFAULT 'draft',
        date          DATE NOT NULL,
        expected_date DATE,
        received_date DATE,
        items         JSONB NOT NULL DEFAULT '[]',
        subtotal      NUMERIC(14,2) DEFAULT 0,
        total         NUMERIC(14,2) DEFAULT 0,
        notes         TEXT DEFAULT '',
        created_at    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dispatches (
        id                  TEXT PRIMARY KEY,
        dispatch_number     TEXT,
        sale_order_id       TEXT DEFAULT '',
        sale_order_number   TEXT DEFAULT '',
        customer            TEXT NOT NULL DEFAULT '',
        customer_id         TEXT DEFAULT '',
        address             TEXT DEFAULT '',
        scheduled_date      DATE NOT NULL,
        scheduled_time      TEXT DEFAULT '',
        driver              TEXT DEFAULT '',
        vehicle_plate       TEXT DEFAULT '',
        status              TEXT NOT NULL DEFAULT 'scheduled',
        delivered_at        DATE,
        delivery_notes      TEXT DEFAULT '',
        items               JSONB NOT NULL DEFAULT '[]',
        total               NUMERIC(14,2) DEFAULT 0,
        date                DATE NOT NULL,
        created_at          TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id             TEXT PRIMARY KEY,
        date           DATE NOT NULL,
        category       TEXT NOT NULL DEFAULT 'Otros',
        description    TEXT NOT NULL DEFAULT '',
        amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
        beneficiary    TEXT DEFAULT '',
        payment_method TEXT DEFAULT 'Transferencia',
        notes          TEXT DEFAULT '',
        recurring      BOOLEAN DEFAULT FALSE,
        period         TEXT DEFAULT 'once',
        created_at     TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS opportunities (
        id             TEXT PRIMARY KEY,
        title          TEXT NOT NULL DEFAULT '',
        customer_id    TEXT DEFAULT '',
        customer       TEXT NOT NULL DEFAULT '',
        stage          TEXT NOT NULL DEFAULT 'lead',
        value          NUMERIC(14,2) DEFAULT 0,
        probability    INTEGER DEFAULT 50,
        expected_close DATE,
        assigned_to    TEXT DEFAULT '',
        quotation_id   TEXT DEFAULT '',
        notes          TEXT DEFAULT '',
        lost_reason    TEXT DEFAULT '',
        created_at     DATE NOT NULL,
        updated_at     DATE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS price_lists (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        discount_percent NUMERIC NOT NULL DEFAULT 0,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS payments (
        id                  TEXT PRIMARY KEY,
        sale_order_id       TEXT DEFAULT '',
        sale_order_number   TEXT DEFAULT '',
        customer            TEXT NOT NULL DEFAULT '',
        customer_id         TEXT DEFAULT '',
        date                DATE NOT NULL,
        amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
        method              TEXT NOT NULL DEFAULT 'Transferencia',
        reference           TEXT DEFAULT '',
        notes               TEXT DEFAULT '',
        created_at          TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS suppliers (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        contact_name  TEXT DEFAULT '',
        email         TEXT DEFAULT '',
        phone         TEXT DEFAULT '',
        address       TEXT DEFAULT '',
        city          TEXT DEFAULT '',
        category      TEXT DEFAULT '',
        notes         TEXT DEFAULT '',
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS returns (
        id                  TEXT PRIMARY KEY,
        return_number       TEXT,
        sale_order_id       TEXT DEFAULT '',
        sale_order_number   TEXT DEFAULT '',
        customer            TEXT NOT NULL DEFAULT '',
        customer_id         TEXT DEFAULT '',
        date                DATE,
        reason              TEXT DEFAULT '',
        status              TEXT NOT NULL DEFAULT 'pending',
        items               JSONB NOT NULL DEFAULT '[]',
        subtotal            NUMERIC(14,2) DEFAULT 0,
        tax                 NUMERIC(14,2) DEFAULT 0,
        total               NUMERIC(14,2) DEFAULT 0,
        credit_note_number  TEXT DEFAULT '',
        refund_method       TEXT DEFAULT '',
        notes               TEXT DEFAULT '',
        created_at          TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list_id    TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_discount NUMERIC DEFAULT 0;
      ALTER TABLE sale_order_items ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS discount       NUMERIC DEFAULT 0;
      ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS price_list_id  TEXT;
      CREATE TABLE IF NOT EXISTS customer_activities (
        id          TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'note',
        date        DATE NOT NULL,
        subject     TEXT NOT NULL DEFAULT '',
        notes       TEXT DEFAULT '',
        done        BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL UNIQUE,
        password   TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'Ventas',
        is_active  BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        user_name   TEXT NOT NULL DEFAULT 'Sistema',
        user_email  TEXT NOT NULL DEFAULT '',
        action      TEXT NOT NULL,
        entity      TEXT NOT NULL,
        entity_id   TEXT,
        entity_name TEXT,
        details     TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS calendar_items (
        id               TEXT PRIMARY KEY,
        kind             TEXT NOT NULL DEFAULT 'meeting',
        title            TEXT NOT NULL DEFAULT '',
        description      TEXT DEFAULT '',
        location         TEXT DEFAULT '',
        date             DATE NOT NULL,
        time             TEXT DEFAULT '',
        reminder_minutes INTEGER DEFAULT 15,
        notify_app       BOOLEAN DEFAULT TRUE,
        notify_whatsapp  BOOLEAN DEFAULT FALSE,
        whatsapp_phone   TEXT DEFAULT '',
        notified_at      TIMESTAMP,
        done             BOOLEAN DEFAULT FALSE,
        created_at       TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id              TEXT PRIMARY KEY,
        item_id         TEXT NOT NULL,
        item_name       TEXT NOT NULL DEFAULT '',
        item_type       TEXT NOT NULL DEFAULT 'supply',
        movement_type   TEXT NOT NULL DEFAULT 'entry',
        quantity         NUMERIC(14,2) NOT NULL DEFAULT 0,
        previous_stock   NUMERIC(14,2) DEFAULT 0,
        new_stock        NUMERIC(14,2) DEFAULT 0,
        unit            TEXT DEFAULT 'u',
        reference       TEXT DEFAULT '',
        notes           TEXT DEFAULT '',
        created_by      TEXT DEFAULT 'Sistema',
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `)
    // Seed default admin if no users exist
    const { rowCount } = await pool.query('SELECT 1 FROM users LIMIT 1')
    if (rowCount === 0) {
      await pool.query(
        `INSERT INTO users (id, name, email, password, role, is_active)
         VALUES ('u1','Admin General','admin@empresa.com','admin123','Administrador',true),
                ('u2','María García','maria@empresa.com','maria123','Producción',true),
                ('u3','Carlos López','carlos@empresa.com','carlos123','Producción',true),
                ('u4','Ana Ramos','ana@empresa.com','ana123','Ventas',true),
                ('u5','Roberto Méndez','roberto@empresa.com','roberto123','Inventario',false)
         ON CONFLICT (id) DO NOTHING`
      )
      console.log('✅ Default users seeded')
    }
    console.log('✅ Migrations OK')
  } catch (e) {
    console.error('⚠️  Migration error:', e.message)
  }
}
migrate()

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '50mb' })) // limit amplio para logos y PDF base64

// ── Rate limiting ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión, intente de nuevo más tarde' },
})

app.use('/api/', generalLimiter)
app.use('/api/users/login', loginLimiter)

// ── Authentication middleware ───────────────────────────────────────────────
app.use(authMiddleware)

app.use('/api/users',             usersRouter)
app.use('/api/email',             emailRouter)
app.use('/api/supplies',          suppliesRouter)
app.use('/api/products',          productsRouter)
app.use('/api/production-orders', productionOrdersRouter)
app.use('/api/customers',         customersRouter)
app.use('/api/sale-orders',       saleOrdersRouter)
app.use('/api/recipes',           recipesRouter)
app.use('/api/settings',          settingsRouter)
app.use('/api/reset',             resetRouter)
app.use('/api/audit',             auditLogRouter)
app.use('/api/quotations',        quotationsRouter)
app.use('/api/customer-activities', customerActivitiesRouter)
app.use('/api/purchase-orders',    purchaseOrdersRouter)
app.use('/api/dispatches',         dispatchesRouter)
app.use('/api/expenses',           expensesRouter)
app.use('/api/opportunities',      opportunitiesRouter)
app.use('/api/price-lists',        priceListsRouter)
app.use('/api/import',             importRouter)
app.use('/api/returns',            returnsRouter)
app.use('/api/suppliers',          suppliersRouter)
app.use('/api/payments',           paymentsRouter)
app.use('/api/inventory-movements', inventoryMovementsRouter)
app.use('/api/calendar-items',     calendarItemsRouter)
app.use('/api/whatsapp',           whatsappRouter)

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use((err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err.message)
  const status = err.status || err.statusCode || 500
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message })
})

app.listen(PORT, () => {
  console.log(`✅ Servidor ERP corriendo en http://localhost:${PORT}`)
  // Start background services after the HTTP server is up
  startWhatsApp().catch((e) => console.warn('WhatsApp init failed:', e.message))
  startScheduler()
})
