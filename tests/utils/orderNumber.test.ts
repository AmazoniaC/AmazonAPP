import { describe, it, expect } from 'vitest'
import { nextOrderNumber } from '../../src/utils/orderNumber'

describe('nextOrderNumber', () => {
  it('starts at 0001 when there are no existing numbers', () => {
    expect(nextOrderNumber([], 'VTA-2026-')).toBe('VTA-2026-0001')
  })

  it('continues from the highest existing sequence, not the count', () => {
    // Only 2 records exist, but the max sequence is 12 (some were deleted).
    expect(nextOrderNumber(['VTA-2026-0005', 'VTA-2026-0012'], 'VTA-2026-')).toBe('VTA-2026-0013')
  })

  it('ignores numbers from a different prefix (e.g. a different year)', () => {
    expect(nextOrderNumber(['VTA-2025-0099', 'VTA-2026-0002'], 'VTA-2026-')).toBe('VTA-2026-0003')
  })

  it('ignores malformed or unrelated strings without throwing', () => {
    expect(nextOrderNumber(['not-a-number', '', 'VTA-2026-abc', 'VTA-2026-0003'], 'VTA-2026-'))
      .toBe('VTA-2026-0004')
  })

  it('tolerates null/undefined entries in the array', () => {
    const withHoles = ['VTA-2026-0001', null, undefined] as unknown as string[]
    expect(nextOrderNumber(withHoles, 'VTA-2026-')).toBe('VTA-2026-0002')
  })

  it('escapes regex special characters in the prefix', () => {
    // A prefix containing '.' must be treated literally, not as "any character".
    expect(nextOrderNumber(['CO.2026-0001', 'COX2026-9999'], 'CO.2026-')).toBe('CO.2026-0002')
  })

  it('respects a custom pad length', () => {
    expect(nextOrderNumber(['REF-7'], 'REF-', 2)).toBe('REF-08')
  })

  it('does not zero-pad past a sequence that already exceeds the pad width', () => {
    expect(nextOrderNumber(['VTA-2026-99999'], 'VTA-2026-', 4)).toBe('VTA-2026-100000')
  })
})
