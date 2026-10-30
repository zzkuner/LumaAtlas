import { describe, expect, it } from 'vitest'
import { isPublicSetting } from '../../server/services/settings/access'

describe('public settings access', () => {
  it('allows settings intentionally consumed by the public app', () => {
    expect(isPublicSetting('app', 'title')).toBe(true)
    expect(isPublicSetting('map', 'mapbox.token')).toBe(true)
  })

  it('never exposes server-side credentials', () => {
    expect(isPublicSetting('system', 'auth.github.clientSecret')).toBe(false)
    expect(isPublicSetting('location', 'mapbox.token')).toBe(false)
  })

  it('fails closed for unknown settings', () => {
    expect(isPublicSetting('unknown', 'value')).toBe(false)
  })
})
