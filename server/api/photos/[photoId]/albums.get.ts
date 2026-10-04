import { and, eq } from 'drizzle-orm'
import z from 'zod'

export default eventHandler(async (event) => {
  const { photoId } = await getValidatedRouterParams(
    event,
    z.object({
      photoId: z.string(),
    }).parse,
  )

  const db = useDB()
  const session = await getUserSession(event)

  if (!session.user) {
    const photo = db
      .select({ id: tables.photos.id })
      .from(tables.photos)
      .where(
        and(eq(tables.photos.id, photoId), eq(tables.photos.isVisible, true)),
      )
      .get()

    if (!photo) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Photo not found',
      })
    }
  }

  // 获取包含该照片的所有相册
  const albumQuery = db
    .select({
      id: tables.albums.id,
      title: tables.albums.title,
      description: tables.albums.description,
      coverPhotoId: tables.albums.coverPhotoId,
      createdAt: tables.albums.createdAt,
      updatedAt: tables.albums.updatedAt,
    })
    .from(tables.albums)
    .innerJoin(
      tables.albumPhotos,
      eq(tables.albums.id, tables.albumPhotos.albumId),
    )
  const albums = session.user
    ? albumQuery.where(eq(tables.albumPhotos.photoId, photoId)).all()
    : albumQuery
        .where(
          and(
            eq(tables.albumPhotos.photoId, photoId),
            eq(tables.albums.isHidden, false),
          ),
        )
        .all()

  return albums
})
