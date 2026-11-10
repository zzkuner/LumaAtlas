import { describe, expect, it } from 'vitest'
import {
  isPublicAboutLink,
  normalizeAboutLinks,
} from '../../shared/utils/about-links'

describe('about links', () => {
  it('preserves existing URL-only settings', () => {
    const links = normalizeAboutLinks({
      website: 'https://example.com',
      github: '',
    })

    expect(links.website).toEqual({
      url: 'https://example.com',
      label: '个人网站',
      enabled: true,
    })
    expect(links.github.enabled).toBe(false)
  })

  it('respects each link label and visibility setting', () => {
    const links = normalizeAboutLinks({
      website: {
        url: 'https://example.com',
        label: '我的主页',
        enabled: false,
      },
      x: {
        url: 'https://example.com/x',
        label: '',
        enabled: true,
      },
    })

    expect(links.website.label).toBe('我的主页')
    expect(links.website.enabled).toBe(false)
    expect(links.x.label).toBe('')
  })

  it('rejects non-web URLs before public rendering', () => {
    expect(isPublicAboutLink('https://example.com')).toBe(true)
    expect(isPublicAboutLink('javascript:alert(1)')).toBe(false)
    expect(isPublicAboutLink('not a url')).toBe(false)
  })
})
