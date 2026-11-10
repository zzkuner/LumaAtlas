export const ABOUT_LINK_OPTIONS = [
  { id: 'website', label: '个人网站', icon: 'lucide:globe-2' },
  { id: 'instagram', label: 'Instagram', icon: 'simple-icons:instagram' },
  { id: 'x', label: 'X', icon: 'simple-icons:x' },
  { id: 'github', label: 'GitHub', icon: 'simple-icons:github' },
] as const

export type AboutLinkId = (typeof ABOUT_LINK_OPTIONS)[number]['id']

export interface AboutLinkSetting {
  url: string
  label: string
  enabled: boolean
}

export function normalizeAboutLinks(
  value: unknown,
): Record<AboutLinkId, AboutLinkSetting> {
  const links =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return Object.fromEntries(
    ABOUT_LINK_OPTIONS.map(({ id, label }) => {
      const entry = links[id]
      const config =
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : null
      const url =
        typeof entry === 'string'
          ? entry.trim()
          : typeof config?.url === 'string'
            ? config.url.trim()
            : ''

      return [
        id,
        {
          url,
          label: typeof config?.label === 'string' ? config.label : label,
          enabled:
            config?.enabled === undefined
              ? Boolean(url)
              : config.enabled === true,
        },
      ]
    }),
  ) as Record<AboutLinkId, AboutLinkSetting>
}

export function isPublicAboutLink(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}
