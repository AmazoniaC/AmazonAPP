// ─────────────────────────────────────────────────────────────────────────────
// Date formatting for display.
//
// Values arrive from the API in several shapes — 'YYYY-MM-DD', a full ISO
// timestamp ('2024-11-04T00:00:00.000Z'), or already-empty — and several screens
// used to print them raw. These helpers always return something a person can
// read, and never the letter "T" in the middle of a date.
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise any supported input to a Date, or null when unusable. */
function toDate(value?: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value).trim()
  if (!raw) return null

  // Plain 'YYYY-MM-DD' (or the date half of an ISO string): read it as local
  // noon so a negative UTC offset can't roll it back to the previous day.
  const dateOnly = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const d = new Date(`${dateOnly}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "4 nov 2024" — the default for tables and lists. */
export function formatDate(value?: string | Date | null, fallback = '—'): string {
  const d = toDate(value)
  if (!d) return fallback
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "4 nov" — when the year is obvious from context and space is tight. */
export function formatDateShort(value?: string | Date | null, fallback = '—'): string {
  const d = toDate(value)
  if (!d) return fallback
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

/** "lunes, 4 de noviembre de 2024" — for detail headers. */
export function formatDateLong(value?: string | Date | null, fallback = '—'): string {
  const d = toDate(value)
  if (!d) return fallback
  return d.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** "4 nov 2024, 3:20 p. m." — when the time of day matters. */
export function formatDateTime(value?: string | Date | null, fallback = '—'): string {
  const d = toDate(value)
  if (!d) return fallback
  return d.toLocaleString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/**
 * Whole days between today and the given date. Negative = overdue.
 * Used to turn a due date into "Vencido 12 d".
 */
export function daysUntil(value?: string | Date | null): number | null {
  const d = toDate(value)
  if (!d) return null
  const today = new Date()
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((a - b) / 86_400_000)
}

/** 'YYYY-MM-DD' for <input type="date"> values. */
export function toInputDate(value?: string | Date | null): string {
  const d = toDate(value)
  if (!d) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
