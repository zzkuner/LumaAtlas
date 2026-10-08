import { eq } from 'drizzle-orm'
import z from 'zod'
import { serializeAlbumShare } from '~~/server/services/album-share'

export default eventHandler(async (event) => {
  await requireUserSession(event)

  const { albumId } = await getValidatedRouterParams(
    event,
    z.object({
      albumId: z.coerce.number().int().positive(),
    }).parse,
  )

  const db = useDB()
  const album = db
    .select({ id: tables.albums.id })
    .from(tables.albums)
    .where(eq(tables.albums.id, albumId))
    .get()

  if (!album) {
    throw createError({ statusCode: 404, statusMessage: 'Album not found' })
  }

  const share = db
    .select()
    .from(tables.albumShares)
    .where(eq(tables.albumShares.albumId, albumId))
    .get()

  return share ? serializeAlbumShare(event, share) : null
})
