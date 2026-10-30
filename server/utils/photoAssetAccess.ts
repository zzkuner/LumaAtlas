import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { tables, useDB } from '~~/server/utils/db'

const PUBLIC_ASSET_CACHE_MS = 5_000

let publicAssetCache: { expiresAt: number; keys: Set<string> } | null = null

const normalizeAssetKey = (value: string): string => {
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid asset path' })
  }

  const normalized = decoded
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')

  if (
    !normalized ||
    normalized.includes('\0') ||
    normalized.split('/').some((segment) => segment === '..')
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid asset path' })
  }

  return normalized
}

const addAssetReference = (keys: Set<string>, value?: string | null) => {
  if (!value) return

  try {
    const url = new URL(value, 'http://lumaatlas.local')
    const normalizedPath = normalizeAssetKey(url.pathname)
    keys.add(normalizedPath)
    for (const routePrefix of ['storage/', 'image/']) {
      if (normalizedPath.startsWith(routePrefix)) {
        keys.add(normalizedPath.slice(routePrefix.length))
      }
    }
  } catch {
    keys.add(normalizeAssetKey(value))
  }
}

const loadPublicAssetKeys = (): Set<string> => {
  const rows = useDB()
    .select({
      storageKey: tables.photos.storageKey,
      thumbnailKey: tables.photos.thumbnailKey,
      originalUrl: tables.photos.originalUrl,
      thumbnailUrl: tables.photos.thumbnailUrl,
      thumbnailVariants: tables.photos.thumbnailVariants,
      livePhotoVideoKey: tables.photos.livePhotoVideoKey,
      livePhotoVideoUrl: tables.photos.livePhotoVideoUrl,
    })
    .from(tables.photos)
    .where(eq(tables.photos.isVisible, true))
    .all()

  const keys = new Set<string>()
  for (const row of rows) {
    addAssetReference(keys, row.storageKey)
    addAssetReference(keys, row.thumbnailKey)
    addAssetReference(keys, row.originalUrl)
    addAssetReference(keys, row.thumbnailUrl)
    addAssetReference(keys, row.livePhotoVideoKey)
    addAssetReference(keys, row.livePhotoVideoUrl)
    for (const variant of row.thumbnailVariants || []) {
      addAssetReference(keys, variant.key)
      addAssetReference(keys, variant.url)
    }
  }
  return keys
}

export async function assertPhotoAssetAccess(
  event: H3Event,
  requestedKey: string,
): Promise<string> {
  const normalizedKey = normalizeAssetKey(requestedKey)
  const session = await getUserSession(event)
  if (session.user?.isAdmin) return normalizedKey

  const now = Date.now()
  if (!publicAssetCache || publicAssetCache.expiresAt <= now) {
    publicAssetCache = {
      expiresAt: now + PUBLIC_ASSET_CACHE_MS,
      keys: loadPublicAssetKeys(),
    }
  }

  if (!publicAssetCache.keys.has(normalizedKey)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return normalizedKey
}
