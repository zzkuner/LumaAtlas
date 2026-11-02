import { count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { publicPhotoColumns } from '~~/server/utils/publicPhotoColumns'
import { sanitizePhotoContent } from '~~/shared/utils/photo-content'

export default eventHandler(async (event) => {
  const db = useDB()
  const query = await getValidatedQuery(
    event,
    z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse,
  )

  // Album visibility controls album discovery. Photo visibility independently
  // controls whether the image appears in the public gallery.
  const visibilityCondition = eq(tables.photos.isVisible, true)

  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
    Vary: 'Cookie',
  })

  // Preserve the original array response unless pagination is requested.
  if (!query.page && !query.limit) {
    const photos = db
      .select(publicPhotoColumns)
      .from(tables.photos)
      .where(visibilityCondition)
      .orderBy(desc(tables.photos.dateTaken))
      .all()
    return photos.map(sanitizePhotoContent)
  }

  const page = query.page || 1
  const pageSize = query.limit || 40
  const total =
    db
      .select({ value: count() })
      .from(tables.photos)
      .where(visibilityCondition)
      .get()?.value || 0
  const items = db
    .select(publicPhotoColumns)
    .from(tables.photos)
    .where(visibilityCondition)
    .orderBy(desc(tables.photos.dateTaken))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()

  return {
    items: items.map(sanitizePhotoContent),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
})
