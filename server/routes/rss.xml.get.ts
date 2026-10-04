import { and, desc, eq, notInArray } from 'drizzle-orm'

import { settingsManager } from '~~/server/services/settings/settingsManager'
import { tables, useDB } from '~~/server/utils/db'

const escapeXml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const toAbsoluteUrl = (value: string | null, origin: string) => {
  if (!value) return null

  try {
    return new URL(value, origin).toString()
  } catch {
    return null
  }
}

const getImageMimeType = (url: string) => {
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.endsWith('.webp')) return 'image/webp'
  if (pathname.endsWith('.png')) return 'image/png'
  if (pathname.endsWith('.avif')) return 'image/avif'
  return 'image/jpeg'
}

const getPublicationDate = (
  dateTaken: string | null,
  modified: string | null,
) => {
  const parsed = new Date(dateTaken || modified || Date.now())
  return Number.isNaN(parsed.getTime())
    ? new Date().toUTCString()
    : parsed.toUTCString()
}

export default eventHandler(async (event) => {
  const enabled =
    (await settingsManager.get<boolean>('publishing', 'rss.enabled', true)) ??
    true

  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: 'RSS feed disabled' })
  }

  const configuredLimit =
    (await settingsManager.get<number>('publishing', 'rss.limit', 20)) ?? 20
  const normalizedLimit = Number.isFinite(configuredLimit)
    ? configuredLimit
    : 20
  const limit = Math.min(100, Math.max(5, Math.round(normalizedLimit)))
  const source =
    (await settingsManager.get<'all' | 'featured'>(
      'publishing',
      'rss.source',
      'all',
    )) ?? 'all'
  const title =
    (await settingsManager.get<string>('app', 'title', 'LumaAtlas')) ||
    'LumaAtlas'
  const description =
    (await settingsManager.get<string>('app', 'description')) ||
    (await settingsManager.get<string>('app', 'slogan')) ||
    `${title} photo feed`

  const db = useDB()
  const hiddenPhotoIds = db
    .select({ photoId: tables.albumPhotos.photoId })
    .from(tables.albumPhotos)
    .innerJoin(tables.albums, eq(tables.albumPhotos.albumId, tables.albums.id))
    .where(eq(tables.albums.isHidden, true))
    .all()
    .map((row) => row.photoId)

  const photos = db
    .select()
    .from(tables.photos)
    .where(
      and(
        eq(tables.photos.isVisible, true),
        source === 'featured' ? eq(tables.photos.isFeatured, true) : undefined,
        hiddenPhotoIds.length > 0
          ? notInArray(tables.photos.id, hiddenPhotoIds)
          : undefined,
      ),
    )
    .orderBy(desc(tables.photos.dateTaken), desc(tables.photos.lastModified))
    .limit(limit)
    .all()

  const requestUrl = getRequestURL(event)
  const origin = requestUrl.origin
  const feedUrl = `${origin}/rss.xml`
  const items = photos
    .map((photo) => {
      const itemUrl = `${origin}/${encodeURIComponent(photo.id)}`
      const imageUrl = toAbsoluteUrl(
        photo.thumbnailUrl || photo.originalUrl,
        origin,
      )
      const media = imageUrl
        ? `
        <enclosure url="${escapeXml(imageUrl)}" type="${getImageMimeType(imageUrl)}" />
        <media:content url="${escapeXml(imageUrl)}" type="${getImageMimeType(imageUrl)}" medium="image" />
        <media:thumbnail url="${escapeXml(imageUrl)}" />`
        : ''

      return `
      <item>
        <title>${escapeXml(photo.title || 'Untitled photo')}</title>
        <link>${escapeXml(itemUrl)}</link>
        <guid isPermaLink="false">${escapeXml(photo.id)}</guid>
        <pubDate>${getPublicationDate(photo.dateTaken, photo.lastModified)}</pubDate>
        <description>${escapeXml(photo.description || '')}</description>${media}
      </item>`
    })
    .join('')

  setResponseHeaders(event, {
    'content-type': 'application/rss+xml; charset=utf-8',
    'cache-control': 'public, max-age=300, s-maxage=300',
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(description)}</description>
    <generator>LumaAtlas</generator>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`
})
