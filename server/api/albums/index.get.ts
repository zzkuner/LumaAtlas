import { and, eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const db = useDB()
  const session = await getUserSession(event)

  // 获取所有相册，按创建时间倒序
  const albumQuery = db.select().from(tables.albums)
  const albums = session.user
    ? albumQuery.all()
    : albumQuery
        .where(
          and(
            eq(tables.albums.isHidden, false),
            eq(tables.albums.visibility, 'public'),
          ),
        )
        .all()

  // 为每个相册获取照片 ID 列表（避免循环引用）
  const albumsWithPhotoIds = await Promise.all(
    albums.map(async (album) => {
      const photoIdQuery = db
        .select({
          photoId: tables.albumPhotos.photoId,
          position: tables.albumPhotos.position,
        })
        .from(tables.albumPhotos)

      const photoIds = session.user
        ? photoIdQuery
            .where(eq(tables.albumPhotos.albumId, album.id))
            .orderBy(tables.albumPhotos.position)
            .all()
        : photoIdQuery
            .innerJoin(
              tables.photos,
              eq(tables.albumPhotos.photoId, tables.photos.id),
            )
            .where(
              and(
                eq(tables.albumPhotos.albumId, album.id),
                eq(tables.photos.isVisible, true),
              ),
            )
            .orderBy(tables.albumPhotos.position)
            .all()

      return {
        ...album,
        // 即使是空相册，也返回空数组而不是 undefined
        photoIds: photoIds.length > 0 ? photoIds.map((p) => p.photoId) : [],
      }
    }),
  )

  // 按创建时间倒序排列
  return albumsWithPhotoIds.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})
