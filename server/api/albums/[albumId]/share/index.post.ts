import { eq } from 'drizzle-orm'
import z from 'zod'
import {
  createAlbumShareToken,
  serializeAlbumShare,
} from '~~/server/services/album-share'

export default eventHandler(async (event) => {
  await requireUserSession(event)

  const { albumId } = await getValidatedRouterParams(
    event,
    z.object({
      albumId: z.coerce.number().int().positive(),
    }).parse,
  )
  const body = await readValidatedBody(
    event,
    z.object({
      password: z.string().min(4).max(128).optional(),
      clearPassword: z.boolean().optional(),
      expiresAt: z.iso.datetime().nullable().optional(),
      allowOriginalDownload: z.boolean().optional(),
      showExif: z.boolean().optional(),
      showMap: z.boolean().optional(),
      isActive: z.boolean().optional(),
      regenerateToken: z.boolean().optional(),
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

  const existing = db
    .select()
    .from(tables.albumShares)
    .where(eq(tables.albumShares.albumId, albumId))
    .get()
  const now = new Date()
  const passwordHash = body.clearPassword
    ? null
    : body.password
      ? await hashPassword(body.password)
      : existing?.passwordHash || null
  const expiresAt =
    body.expiresAt === undefined
      ? existing?.expiresAt || null
      : body.expiresAt
        ? new Date(body.expiresAt)
        : null

  const share = existing
    ? db
        .update(tables.albumShares)
        .set({
          token: body.regenerateToken
            ? createAlbumShareToken()
            : existing.token,
          passwordHash,
          expiresAt,
          allowOriginalDownload:
            body.allowOriginalDownload ?? existing.allowOriginalDownload,
          showExif: body.showExif ?? existing.showExif,
          showMap: body.showMap ?? existing.showMap,
          isActive: body.isActive ?? existing.isActive,
          updatedAt: now,
        })
        .where(eq(tables.albumShares.id, existing.id))
        .returning()
        .get()
    : db
        .insert(tables.albumShares)
        .values({
          albumId,
          token: createAlbumShareToken(),
          passwordHash,
          expiresAt,
          allowOriginalDownload: body.allowOriginalDownload ?? false,
          showExif: body.showExif ?? true,
          showMap: body.showMap ?? true,
          isActive: body.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get()

  return serializeAlbumShare(event, share)
})
