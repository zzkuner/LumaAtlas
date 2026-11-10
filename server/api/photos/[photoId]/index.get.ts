import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { publicPhotoColumns } from '~~/server/utils/publicPhotoColumns'
import { sanitizePhotoContent } from '~~/shared/utils/photo-content'

export default eventHandler(async (event) => {
  const { photoId } = await getValidatedRouterParams(
    event,
    z.object({ photoId: z.string().min(1) }).parse,
  )
  const session = await getUserSession(event)
  const photo = useDB()
    .select(publicPhotoColumns)
    .from(tables.photos)
    .where(
      and(
        eq(tables.photos.id, photoId),
        session.user?.isAdmin ? undefined : eq(tables.photos.isVisible, true),
      ),
    )
    .get()
  if (!photo)
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  return sanitizePhotoContent(photo)
})
