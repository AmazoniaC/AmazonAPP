import { describe, it, expect } from 'vitest'
import { cleanPhone } from '../../src/utils/whatsapp'

describe('cleanPhone', () => {
  it('adds the default Colombia country code to a bare 10-digit number', () => {
    expect(cleanPhone('3001234567')).toBe('573001234567')
  })

  it('leaves a number that already has the country code untouched', () => {
    expect(cleanPhone('573001234567')).toBe('573001234567')
  })

  it('strips formatting characters (spaces, dashes, parens, +)', () => {
    expect(cleanPhone('+57 (300) 123-4567')).toBe('573001234567')
  })

  it('strips a leading international "00" prefix', () => {
    expect(cleanPhone('0057 3001234567')).toBe('573001234567')
  })

  it('adds the country code to a shorter local number (7-9 digits)', () => {
    expect(cleanPhone('1234567')).toBe('571234567')
  })

  it('returns an empty string for empty/whitespace-only input', () => {
    expect(cleanPhone('')).toBe('')
    expect(cleanPhone('   ')).toBe('')
  })

  it('passes through a number that is already long but does not start with 57', () => {
    // e.g. a US number: don't misattribute it to Colombia.
    expect(cleanPhone('+1 415 555 0134')).toBe('14155550134')
  })
})
