import { and, desc, eq, isNotNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const conditions = [
    eq(tables.photos.isVisible, true),
    isNotNull(tables.photos.latitude),
    isNotNull(tables.photos.longitude),
  ]

  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  })

  return useDB()
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
