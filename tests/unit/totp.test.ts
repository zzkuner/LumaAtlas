import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotp,
} from '../../server/services/auth/totp'

beforeAll(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({
    session: {
      password: 'test-session-password-that-is-longer-than-32-characters',
    },
  }))
})

describe('TOTP security helpers', () => {
  it('generates and verifies a six-digit code within the accepted time window', () => {
    const secret = generateTotpSecret()
    const timestamp = 1_800_000_000_000
    const code = generateTotpCode(secret, timestamp)

    expect(secret).toMatch(/^[A-Z2-7]+$/)
    expect(code).toMatch(/^\d{6}$/)
    expect(verifyTotp(secret, code, timestamp)).toBe(true)
    expect(verifyTotp(secret, code, timestamp + 29_000)).toBe(true)
    expect(verifyTotp(secret, code, timestamp + 91_000)).toBe(false)
  })

  it('encrypts secrets with authenticated encryption', () => {
    const secret = generateTotpSecret()
    const encrypted = encryptTotpSecret(secret)

    expect(encrypted).not.toContain(secret)
    expect(encrypted.split('.')).toHaveLength(3)
    expect(decryptTotpSecret(encrypted)).toBe(secret)
  })

  it('normalizes and hashes recovery codes consistently', () => {
    expect(normalizeRecoveryCode('abcd-1234 efgh')).toBe('ABCD1234EFGH')
    expect(hashRecoveryCode('ABCD-1234')).toBe(hashRecoveryCode('abcd 1234'))
  })

  it('generates unique, printable recovery codes', () => {
    const codes = generateRecoveryCodes(10)

    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
    expect(
      codes.every((code) => /^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/.test(code)),
    ).toBe(true)
  })
})
