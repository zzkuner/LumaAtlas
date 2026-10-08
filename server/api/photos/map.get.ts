import { and, desc, eq, isNotNull, notInArray } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const db = useDB()
  const hiddenAlbumPhotos = db
    .select({ photoId: tables.albumPhotos.photoId })
    .from(tables.albumPhotos)
    .innerJoin(tables.albums, eq(tables.albumPhotos.albumId, tables.albums.id))
    .where(eq(tables.albums.isHidden, true))
    .all()
  const hiddenPhotoIds = hiddenAlbumPhotos.map((row) => row.photoId)

  const conditions = [
    eq(tables.photos.isVisible, true),
    isNotNull(tables.photos.latitude),
    isNotNull(tables.photos.longitude),
  ]
  if (hiddenPhotoIds.length > 0) {
    conditions.push(notInArray(tables.photos.id, hiddenPhotoIds))
  }

  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  })

  return db
    .select({
      id: tables.photos.id,
      title: tables.photos.title,
      thumbnailUrl: tables.photos.thumbnailUrl,
      thumbnailHash: tables.photos.thumbnailHash,
      dateTaken: tables.photos.dateTaken,
      latitude: tables.photos.latitude,
      longitude: tables.photos.longitude,
      city: tables.photos.city,
      country: tables.photos.country,
      locationName: tables.photos.locationName,
      exif: tables.photos.exif,
    })
    .from(tables.photos)
    .where(and(...conditions))
    .orderBy(desc(tables.photos.dateTaken))
    .all()
})
