import { and, eq, inArray, max } from 'drizzle-orm'
import { z } from 'zod'

import { tables, useDB } from '~~/server/utils/db'

const tagOperationSchema = z.object({
  mode: z.enum(['add', 'remove', 'replace']),
  values: z.array(z.string().trim().max(128)).max(64),
})

const bodySchema = z
  .object({
    photoIds: z.array(z.string().min(1)).min(1).max(500),
    tags: tagOperationSchema.optional(),
    addToAlbumIds: z.array(z.number().int().positive()).max(50).optional(),
    removeFromAlbumIds: z.array(z.number().int().positive()).max(50).optional(),
    isVisible: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.tags !== undefined ||
      (data.addToAlbumIds?.length ?? 0) > 0 ||
      (data.removeFromAlbumIds?.length ?? 0) > 0 ||
      data.isVisible !== undefined ||
      data.isFeatured !== undefined,
    { message: 'No batch changes provided' },
  )

const normalizeTags = (tags: string[]) => {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const tag of tags) {
    const value = tag.trim()
    const key = value.toLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    normalized.push(value)
  }

  return normalized
}

const applyTagOperation = (
  currentTags: string[] | null,
  operation: z.infer<typeof tagOperationSchema>,
) => {
  const current = normalizeTags(currentTags ?? [])
  const values = normalizeTags(operation.values)

  if (operation.mode === 'replace') return values

  if (operation.mode === 'remove') {
    const removals = new Set(values.map((tag) => tag.toLowerCase()))
    return current.filter((tag) => !removals.has(tag.toLowerCase()))
  }

  return normalizeTags([...current, ...values])
}

export default eventHandler(async (event) => {
  await requireUserSession(event)

  const body = bodySchema.parse(await readBody(event))
  const photoIds = [...new Set(body.photoIds)]
  const addToAlbumIds = [...new Set(body.addToAlbumIds ?? [])]
  const removeFromAlbumIds = [...new Set(body.removeFromAlbumIds ?? [])]
  const db = useDB()

  const result = db.transaction((tx) => {
    const photos = tx
      .select({ id: tables.photos.id, tags: tables.photos.tags })
      .from(tables.photos)
      .where(inArray(tables.photos.id, photoIds))
      .all()

    if (photos.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No matching photos found',
      })
    }

    const existingPhotoIds = photos.map((photo) => photo.id)
    const statusUpdate: {
      isVisible?: boolean
      isFeatured?: boolean
    } = {}

    if (body.isVisible !== undefined) {
      statusUpdate.isVisible = body.isVisible
    }
    if (body.isFeatured !== undefined) {
      statusUpdate.isFeatured = body.isFeatured
    }

    if (Object.keys(statusUpdate).length > 0) {
      tx.update(tables.photos)
        .set(statusUpdate)
        .where(inArray(tables.photos.id, existingPhotoIds))
        .run()
    }

    if (body.tags) {
      for (const photo of photos) {
        tx.update(tables.photos)
          .set({ tags: applyTagOperation(photo.tags, body.tags) })
          .where(eq(tables.photos.id, photo.id))
          .run()
      }
    }

    if (addToAlbumIds.length > 0) {
      const albums = tx
        .select({ id: tables.albums.id })
        .from(tables.albums)
        .where(inArray(tables.albums.id, addToAlbumIds))
        .all()

      for (const album of albums) {
        const existingRelations = tx
          .select({ photoId: tables.albumPhotos.photoId })
          .from(tables.albumPhotos)
          .where(
            and(
              eq(tables.albumPhotos.albumId, album.id),
              inArray(tables.albumPhotos.photoId, existingPhotoIds),
            ),
          )
          .all()
        const existingRelationIds = new Set(
          existingRelations.map((relation) => relation.photoId),
        )
        const lastPosition = tx
          .select({ value: max(tables.albumPhotos.position) })
          .from(tables.albumPhotos)
          .where(eq(tables.albumPhotos.albumId, album.id))
          .get()

        let position = Number(lastPosition?.value ?? 1000000)
        for (const photoId of existingPhotoIds) {
          if (existingRelationIds.has(photoId)) continue
          tx.insert(tables.albumPhotos)
            .values({
              albumId: album.id,
              photoId,
              position: (position += 10),
            })
            .run()
        }
      }
    }

    if (removeFromAlbumIds.length > 0) {
      tx.delete(tables.albumPhotos)
        .where(
          and(
            inArray(tables.albumPhotos.albumId, removeFromAlbumIds),
            inArray(tables.albumPhotos.photoId, existingPhotoIds),
          ),
        )
        .run()

      const affectedAlbums = tx
        .select({
          id: tables.albums.id,
          coverPhotoId: tables.albums.coverPhotoId,
        })
        .from(tables.albums)
        .where(inArray(tables.albums.id, removeFromAlbumIds))
        .all()

      for (const album of affectedAlbums) {
        if (
          album.coverPhotoId &&
          existingPhotoIds.includes(album.coverPhotoId)
        ) {
          tx.update(tables.albums)
            .set({ coverPhotoId: null, updatedAt: new Date() })
            .where(eq(tables.albums.id, album.id))
            .run()
        }
      }
    }

    return {
      updated: existingPhotoIds.length,
      missing: photoIds.filter((id) => !existingPhotoIds.includes(id)),
    }
  })

  return { success: true, ...result }
})
