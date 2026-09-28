import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatDateShort, formatDateLong, formatDateTime, daysUntil, toInputDate } from '../../src/utils/date'

describe('formatDate', () => {
  it('formats a plain YYYY-MM-DD string', () => {
    expect(formatDate('2024-11-04')).toBe('4 de nov de 2024')
  })

  it('formats a full ISO timestamp', () => {
    expect(formatDate('2024-11-04T00:00:00.000Z')).toBe('4 de nov de 2024')
  })

  it('never rolls a date-only value back a day under a negative UTC offset', () => {
    // Regression guard for the exact bug the toDate() comment calls out:
    // parsing 'YYYY-MM-DD' as UTC midnight would show Nov 3 in negative-offset
    // timezones. Reading it as local noon avoids that regardless of the
    // machine's own timezone.
    expect(formatDate('2024-11-04')).toBe('4 de nov de 2024')
    expect(formatDate('2024-01-01')).toBe('1 de ene de 2024')
  })

  it('returns the fallback for empty/null/invalid input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('accepts a custom fallback', () => {
    expect(formatDate(null, 'Sin fecha')).toBe('Sin fecha')
  })

  it('accepts a Date instance directly', () => {
    expect(formatDate(new Date('2024-11-04T12:00:00'))).toBe('4 de nov de 2024')
  })

  it('rejects an invalid Date instance', () => {
    expect(formatDate(new Date('not-a-date'))).toBe('—')
  })
})

describe('formatDateShort / formatDateLong / formatDateTime', () => {
  it('formatDateShort omits the year', () => {
    expect(formatDateShort('2024-11-04')).toBe('4 de nov')
  })

  it('formatDateLong includes the weekday', () => {
    expect(formatDateLong('2024-11-04')).toContain('lunes')
  })

  it('formatDateTime shows the real time of day, not a noon placeholder', () => {
    // Regression test: toDate() used to force every date-shaped input to
    // local noon, including genuine timestamps — so formatDateTime always
    // showed "12:00 p. m." no matter the actual time. Only a midnight/
    // date-only value should get the noon treatment now.
    expect(formatDateTime('2024-11-04T15:20:00')).toMatch(/3:20|15:20/)
    expect(formatDateTime('2024-11-04T08:05:00')).toMatch(/8:05/)
  })

  it('formatDateTime still avoids the day-rollback bug for a midnight-UTC timestamp', () => {
    expect(formatDateTime('2024-11-04T00:00:00.000Z')).toContain('4 de nov de 2024')
  })
})

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-11-04T09:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns 0 for today', () => {
    expect(daysUntil('2024-11-04')).toBe(0)
  })

  it('returns a positive count for a future date', () => {
    expect(daysUntil('2024-11-16')).toBe(12)
  })

  it('returns a negative count for an overdue date', () => {
    expect(daysUntil('2024-10-23')).toBe(-12)
  })

  it('returns null for empty/invalid input', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('not-a-date')).toBeNull()
  })
})

describe('toInputDate', () => {
  it('formats as YYYY-MM-DD for <input type="date">', () => {
    expect(toInputDate('2024-11-04T15:20:00')).toBe('2024-11-04')
  })

  it('zero-pads single-digit month and day', () => {
    expect(toInputDate('2024-01-05')).toBe('2024-01-05')
  })

  it('returns an empty string for invalid input', () => {
    expect(toInputDate(null)).toBe('')
    expect(toInputDate('garbage')).toBe('')
  })
})
