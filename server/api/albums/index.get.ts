import { and, eq } from 'drizzle-orm'
import { publicPhotoColumns } from '~~/server/utils/publicPhotoColumns'
import { sanitizePhotoContent } from '~~/shared/utils/photo-content'

export default eventHandler(async (event) => {
  const db = useDB()
  const session = await getUserSession(event)
  const isAdmin = Boolean(session.user?.isAdmin)

  // 获取所有相册，按创建时间倒序
  const albumQuery = db.select().from(tables.albums)
  const albums = isAdmin
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

      const photoIds = isAdmin
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

      const orderedIds = photoIds.map((photo) => photo.photoId)
      const coverId =
        (album.coverPhotoId && orderedIds.includes(album.coverPhotoId)
          ? album.coverPhotoId
          : orderedIds[0]) || null
      const coverPhoto = coverId
        ? db
            .select(publicPhotoColumns)
            .from(tables.photos)
            .where(eq(tables.photos.id, coverId))
            .get()
        : null

      return {
        ...album,
        // 即使是空相册，也返回空数组而不是 undefined
        photoIds: orderedIds,
        coverPhoto: coverPhoto ? sanitizePhotoContent(coverPhoto) : null,
      }
    }),
  )

  // 按创建时间倒序排列
  return albumsWithPhotoIds.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})
