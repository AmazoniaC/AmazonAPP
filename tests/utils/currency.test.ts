import { describe, it, expect } from 'vitest'
import { formatCOP } from '../../src/utils/currency'

describe('formatCOP', () => {
  it('formats a whole amount with thousands separators', () => {
    expect(formatCOP(1580000)).toBe('$ 1.580.000')
  })

  it('rounds to the nearest peso instead of showing decimals', () => {
    expect(formatCOP(1999.6)).toBe('$ 2.000')
    expect(formatCOP(1999.4)).toBe('$ 1.999')
  })

  it('formats zero', () => {
    expect(formatCOP(0)).toBe('$ 0')
  })

  it('formats small amounts without stray separators', () => {
    expect(formatCOP(500)).toBe('$ 500')
  })
})
