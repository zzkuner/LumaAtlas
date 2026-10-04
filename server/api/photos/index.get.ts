import { desc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireUserSession(event)

  return useDB()
    .select()
    .from(tables.photos)
    .orderBy(desc(tables.photos.dateTaken))
    .all()
})
