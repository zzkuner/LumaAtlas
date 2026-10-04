import { and, asc, eq, getTableColumns } from 'drizzle-orm'
import z from 'zod'

export default eventHandler(async (event) => {
  const { albumId } = await getValidatedRouterParams(
    event,
    z.object({
      albumId: z
        .string()
        .regex(/^\d+$/)
        .transform((val) => parseInt(val, 10)),
    }).parse,
  )

  const db = useDB()
  const session = await getUserSession(event)

  const album = db
    .select()
    .from(tables.albums)
    .where(eq(tables.albums.id, albumId))
    .get()

  if (!album) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Album not found',
    })
  }

  // 检查相册是否隐藏，如果隐藏则需要用户登录才能访问
  if (album.isHidden) {
    if (!session.user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Album not found',
      })
    }
  }

  // 获取相册中的照片
  const photoQuery = db
    // all fields from tables.photos
    .select({
      ...getTableColumns(tables.photos),
    })
    .from(tables.photos)
    .innerJoin(
      tables.albumPhotos,
      eq(tables.photos.id, tables.albumPhotos.photoId),
    )

  const photos = session.user
    ? photoQuery
        .where(eq(tables.albumPhotos.albumId, albumId))
        .orderBy(asc(tables.albumPhotos.position))
        .all()
    : photoQuery
        .where(
          and(
            eq(tables.albumPhotos.albumId, albumId),
            eq(tables.photos.isVisible, true),
          ),
        )
        .orderBy(asc(tables.albumPhotos.position))
        .all()

  // 验证相册数据完整性
  if (!photos || !Array.isArray(photos)) {
    // 空相册也是合法的，只需要返回空数组
    return {
      ...album,
      photos: [],
    }
  }

  return {
    ...album,
    photos,
  }
})
