import { isIP } from 'node:net'

interface IpLocationResponse {
  success?: boolean
  latitude?: number
  longitude?: number
}

const isPrivateAddress = (ip: string) =>
  ip === '::1' ||
  ip.startsWith('127.') ||
  ip.startsWith('10.') ||
  ip.startsWith('192.168.') ||
  /^172\.(?:1[6-9]|2\d|3[01])\./.test(ip) ||
  /^f[cd][0-9a-f]{2}:/i.test(ip)

export default eventHandler(async (event) => {
  const forwardedIp =
    getHeader(event, 'cf-connecting-ip') ||
    getRequestIP(event, { xForwardedFor: true }) ||
    ''
  const rawIp = forwardedIp.split(',')[0]!.trim()
  const ip = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp

  if (!isIP(ip) || isPrivateAddress(ip)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Public visitor IP is unavailable',
    })
  }

  try {
    const result = await $fetch<IpLocationResponse>(
      `https://ipwho.is/${encodeURIComponent(ip)}`,
      { timeout: 4000, retry: 1 },
    )

    if (
      result.success !== true ||
      typeof result.latitude !== 'number' ||
      typeof result.longitude !== 'number'
    ) {
      throw new Error('IP location provider returned no coordinates')
    }

    setResponseHeader(event, 'Cache-Control', 'private, max-age=3600')
    return {
      latitude: result.latitude,
      longitude: result.longitude,
    }
  } catch {
    logger.chrono.warn('IP location lookup failed')
    throw createError({
      statusCode: 503,
      statusMessage: 'Approximate location is temporarily unavailable',
    })
  }
})
