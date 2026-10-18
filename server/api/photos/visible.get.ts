import { count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

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
    return db
      .select()
      .from(tables.photos)
      .where(visibilityCondition)
      .orderBy(desc(tables.photos.dateTaken))
      .all()
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
    .select()
    .from(tables.photos)
    .where(visibilityCondition)
    .orderBy(desc(tables.photos.dateTaken))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
})
