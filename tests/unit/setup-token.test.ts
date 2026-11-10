import { describe, expect, it } from 'vitest'
import { matchesSetupToken } from '../../server/utils/setup-token'

describe('first-run setup token', () => {
  const token = 'c16f87e38d4f7a6c3b22012e48d514f4'

  it('accepts only the exact configured token', () => {
    expect(matchesSetupToken(token, token)).toBe(true)
    expect(matchesSetupToken(token, `${token.slice(0, -1)}0`)).toBe(false)
  })

  it('rejects short and missing tokens', () => {
    expect(matchesSetupToken('', '')).toBe(false)
    expect(matchesSetupToken('short', 'short')).toBe(false)
    expect(matchesSetupToken(token, '')).toBe(false)
  })
})
