import { eq } from 'drizzle-orm'
import z from 'zod'

export default eventHandler(async (event) => {
  await requireUserSession(event)

  const { albumId } = await getValidatedRouterParams(
    event,
    z.object({ albumId: z.coerce.number().int().positive() }).parse,
  )

  useDB()
    .delete(tables.albumShares)
    .where(eq(tables.albumShares.albumId, albumId))
    .run()

  return { success: true }
})
