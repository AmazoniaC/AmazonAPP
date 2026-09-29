import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool, types } = pg

// Postgres DATE columns (scheduled_date, valid_until, expected_close, ...)
// come back from `pg` as a JS Date object at UTC midnight by default. Every
// route that formats one does `String(value).split('T')[0]`, assuming an ISO
// string — but Date#toString() reads "Tue Sep 29 2026 00:00:00 GMT+0000
// (...)", which has no 'T', so that has always produced an empty string.
// That corrupts every date field a GET returns, and silently 500s ("invalid
// input syntax for type date") any PUT/POST that round-trips one unchanged —
// e.g. changing a dispatch's status without touching its date fields.
// Keep the raw 'YYYY-MM-DD' text Postgres already sends over the wire
// instead of letting `pg` convert it to a Date.
types.setTypeParser(1082, (val) => val)

export const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'erp123',
  database: process.env.DB_NAME     || 'erp_amazonia',
})
