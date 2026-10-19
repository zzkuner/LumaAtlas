import { z } from 'zod'
import { settingsManager } from '~~/server/services/settings/settingsManager'

interface NominatimSearchResult {
  lat?: string
  lon?: string
  display_name?: string
  type?: string
}

interface LocationSearchResult {
  latitude: number
  longitude: number
  displayName: string
  type: string
}

const resultCache = new Map<
  string,
  { expiresAt: number; results: LocationSearchResult[] }
>()
let lastRequestAt = 0
let requestQueue: Promise<void> = Promise.resolve()

const runRateLimited = async <T>(request: () => Promise<T>): Promise<T> => {
  const currentRequest = requestQueue.then(async () => {
    const waitMs = Math.max(0, 1000 - (Date.now() - lastRequestAt))
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    try {
      return await request()
    } finally {
      lastRequestAt = Date.now()
    }
  })

  requestQueue = currentRequest.then(
    () => undefined,
    () => undefined,
  )
  return currentRequest
}

export default eventHandler(async (event) => {
  await requireUserSession(event)

  const query = await getValidatedQuery(
    event,
    z.object({
      q: z.string().trim().min(2).max(120),
      language: z.string().trim().min(2).max(20).optional(),
    }).parse,
  )

  const language = query.language || 'zh-CN'
  const cacheKey = `${language}:${query.q.toLocaleLowerCase()}`
  const cached = resultCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { results: cached.results }
  }

  const baseUrl =
    (await settingsManager.get<string>('location', 'nominatim.baseUrl')) ||
    'https://nominatim.openstreetmap.org'
  const url = new URL('/search', baseUrl)
  url.searchParams.set('q', query.q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '6')
  url.searchParams.set('accept-language', `${language},zh-CN,en`)

  const data = await runRateLimited(async () => {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LumaAtlas/1.0 (+https://photo.kun.ee)',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Location search service is unavailable',
      })
    }
    return (await response.json()) as NominatimSearchResult[]
  })

  const results = data.flatMap<LocationSearchResult>((item) => {
    const latitude = Number(item.lat)
    const longitude = Number(item.lon)
    const displayName = String(item.display_name || '').trim()
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !displayName
    ) {
      return []
    }
    return [
      {
        latitude,
        longitude,
        displayName,
        type: String(item.type || ''),
      },
    ]
  })

  resultCache.set(cacheKey, {
    expiresAt: Date.now() + 10 * 60 * 1000,
    results,
  })

  return { results }
})
