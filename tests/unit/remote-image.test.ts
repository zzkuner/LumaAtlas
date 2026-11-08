import { describe, expect, it } from 'vitest'
import { isPublicAddress } from '../../server/services/import/remote-image'

describe('remote image address guard', () => {
  it.each([
    '127.0.0.1',
    '10.2.3.4',
    '172.18.1.1',
    '192.168.1.1',
    '169.254.169.254',
    '192.0.0.1',
    '100.100.100.200',
    '0.0.0.0',
    '::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(false)
  })

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])(
    'accepts public address %s',
    (address) => {
      expect(isPublicAddress(address)).toBe(true)
    },
  )
})
