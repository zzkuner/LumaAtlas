import { and, asc, eq, getTableColumns, sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { AlbumShare, Photo } from '~~/server/utils/db'

export function createAlbumShareToken() {
  return randomBytes(18).toString('base64url')
}

export function getAlbumShareUrl(event: H3Event, token: string) {
  return `${getRequestURL(event).origin}/share/album/${token}`
}

export function serializeAlbumShare(event: H3Event, share: AlbumShare) {
  return {
    id: share.id,
    albumId: share.albumId,
    token: share.token,
    url: getAlbumShareUrl(event, share.token),
    expiresAt: share.expiresAt?.toISOString() || null,
    allowOriginalDownload: share.allowOriginalDownload,
    showExif: share.showExif,
    showMap: share.showMap,
    hasPassword: Boolean(share.passwordHash),
    isActive: share.isActive,
    viewCount: share.viewCount,
    lastViewedAt: share.lastViewedAt?.toISOString() || null,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  }
}

export function assertAlbumShareAvailable(share: AlbumShare | undefined) {
  if (!share || !share.isActive) {
    throw createError({ statusCode: 404, statusMessage: 'Share not found' })
  }

  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
    throw createError({ statusCode: 410, statusMessage: 'Share expired' })
  }
}

function sanitizePhoto(photo: Photo, share: AlbumShare): Photo {
  const result = { ...photo }

  if (!share.allowOriginalDownload) {
    result.originalUrl = result.thumbnailUrl
  }

  if (!share.showExif) {
    result.exif = null
  } else if (!share.showMap && result.exif) {
    const exif = { ...result.exif }
    delete exif.GPSLatitude
    delete exif.GPSLongitude
    delete exif.GPSLatitudeRef
    delete exif.GPSLongitudeRef
    delete exif.GPSAltitude
    delete exif.GPSAltitudeRef
    result.exif = exif
  }

  if (!share.showMap) {
    result.latitude = null
    result.longitude = null
    result.country = null
    result.city = null
    result.locationName = null
  }

  return result
}

export function getSharedAlbumPayload(event: H3Event, share: AlbumShare) {
  const db = useDB()
  const viewedAt = new Date()
  const album = db
    .select()
    .from(tables.albums)
    .where(eq(tables.albums.id, share.albumId))
    .get()

  if (!album) {
    throw createError({ statusCode: 404, statusMessage: 'Album not found' })
  }

  const photos = db
    .select({ ...getTableColumns(tables.photos) })
    .from(tables.photos)
    .innerJoin(
      tables.albumPhotos,
      eq(tables.photos.id, tables.albumPhotos.photoId),
    )
    .where(
      and(
        eq(tables.albumPhotos.albumId, album.id),
        eq(tables.photos.isVisible, true),
      ),
    )
    .orderBy(asc(tables.albumPhotos.position))
    .all()
    .map((photo) => sanitizePhoto(photo, share))

  db.update(tables.albumShares)
    .set({
      viewCount: sql`${tables.albumShares.viewCount} + 1`,
      lastViewedAt: viewedAt,
    })
    .where(eq(tables.albumShares.id, share.id))
    .run()

  return {
    album: {
      id: album.id,
      title: album.title,
      description: album.description,
      coverPhotoId: album.coverPhotoId,
      createdAt: album.createdAt.toISOString(),
    },
    share: {
      ...serializeAlbumShare(event, share),
      viewCount: share.viewCount + 1,
      lastViewedAt: viewedAt.toISOString(),
    },
    requiresPassword: Boolean(share.passwordHash),
    photos,
  }
}
