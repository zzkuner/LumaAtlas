import { eq } from 'drizzle-orm'
import z from 'zod'
import {
  assertAlbumShareAvailable,
  getSharedAlbumPayload,
  serializeAlbumShare,
} from '~~/server/services/album-share'

export default eventHandler(async (event) => {
  const { token } = await getValidatedRouterParams(
    event,
    z.object({ token: z.string().min(16).max(64) }).parse,
  )
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  const share = useDB()
    .select()
    .from(tables.albumShares)
    .where(eq(tables.albumShares.token, token))
    .get()
  assertAlbumShareAvailable(share)

  if (!share) {
    throw createError({ statusCode: 404, statusMessage: 'Share not found' })
  }

  if (!share.passwordHash) {
    return getSharedAlbumPayload(event, share)
  }

  const album = useDB()
    .select({
      id: tables.albums.id,
      title: tables.albums.title,
      description: tables.albums.description,
      coverPhotoId: tables.albums.coverPhotoId,
      createdAt: tables.albums.createdAt,
    })
    .from(tables.albums)
    .where(eq(tables.albums.id, share.albumId))
    .get()

  if (!album) {
    throw createError({ statusCode: 404, statusMessage: 'Album not found' })
  }

  return {
    album: { ...album, createdAt: album.createdAt.toISOString() },
    share: serializeAlbumShare(event, share),
    requiresPassword: true,
  }
})
