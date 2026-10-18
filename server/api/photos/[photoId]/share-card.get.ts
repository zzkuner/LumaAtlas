import sharp from 'sharp'
import { and, eq } from 'drizzle-orm'

import { tables, useDB } from '~~/server/utils/db'
import { useStorageProvider } from '~~/server/utils/useStorageProvider'

export default defineEventHandler(async (event) => {
  const photoId = getRouterParam(event, 'photoId')
  if (!photoId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Photo ID is required',
    })
  }

  const db = useDB()
  const visibilityCondition = and(
    eq(tables.photos.id, photoId),
    eq(tables.photos.isVisible, true),
  )

  const photo = db
    .select({
      thumbnailKey: tables.photos.thumbnailKey,
      storageKey: tables.photos.storageKey,
    })
    .from(tables.photos)
    .where(visibilityCondition)
    .get()

  const sourceKeys = [photo?.thumbnailKey, photo?.storageKey].filter(
    (key): key is string => Boolean(key),
  )
  if (!sourceKeys.length) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

  const { storageProvider } = useStorageProvider(event)
  let source: Buffer | null = null
  for (const sourceKey of sourceKeys) {
    source = await storageProvider.get(sourceKey)
    if (source) break
  }
  if (!source) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Photo file not found',
    })
  }

  const image = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize(1200, 630, {
      fit: 'cover',
      position: 'attention',
    })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer()

  setResponseHeaders(event, {
    'Content-Type': 'image/png',
    'Content-Length': String(image.length),
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  })

  return image
})
