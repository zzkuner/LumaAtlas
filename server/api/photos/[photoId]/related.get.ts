import { and, desc, eq, ne } from 'drizzle-orm'
import z from 'zod'
import { publicPhotoColumns } from '~~/server/utils/publicPhotoColumns'
import { sanitizePhotoContent } from '~~/shared/utils/photo-content'

const DAY_MS = 24 * 60 * 60 * 1000

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  const { photoId } = await getValidatedRouterParams(
    event,
    z.object({ photoId: z.string().min(1) }).parse,
  )
  const { limit } = await getValidatedQuery(
    event,
    z.object({ limit: z.coerce.number().int().min(1).max(24).default(10) })
      .parse,
  )

  const db = useDB()
  const isAdmin = Boolean(session.user?.isAdmin)
  const current = db
    .select()
    .from(tables.photos)
    .where(eq(tables.photos.id, photoId))
    .get()

  if (!current || (!isAdmin && !current.isVisible)) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

  const candidates = db
    .select(publicPhotoColumns)
    .from(tables.photos)
    .where(
      and(
        ne(tables.photos.id, photoId),
        isAdmin ? undefined : eq(tables.photos.isVisible, true),
      ),
    )
    .orderBy(desc(tables.photos.dateTaken))
    .limit(500)
    .all()
  const currentDate = current.dateTaken
    ? new Date(current.dateTaken).getTime()
    : null
  const currentTags = new Set(
    (current.tags || []).map((tag) => tag.toLocaleLowerCase()),
  )

  return candidates
    .map((photo) => {
      let score = 0
      const reasons: Array<'place' | 'date' | 'camera' | 'lens' | 'tag'> = []

      if (current.city && photo.city === current.city) {
        score += 5
        reasons.push('place')
      } else if (current.country && photo.country === current.country) {
        score += 2
        reasons.push('place')
      }

      if (currentDate && photo.dateTaken) {
        const distance = Math.abs(
          currentDate - new Date(photo.dateTaken).getTime(),
        )
        if (distance <= DAY_MS) {
          score += 5
          reasons.push('date')
        } else if (distance <= 7 * DAY_MS) {
          score += 3
          reasons.push('date')
        } else if (distance <= 31 * DAY_MS) {
          score += 1
          reasons.push('date')
        }
      }

      const currentCamera = current.exif?.Model?.toLocaleLowerCase()
      const candidateCamera = photo.exif?.Model?.toLocaleLowerCase()
      if (currentCamera && candidateCamera === currentCamera) {
        score += 3
        reasons.push('camera')
      }

      const currentLens = current.exif?.LensModel?.toLocaleLowerCase()
      const candidateLens = photo.exif?.LensModel?.toLocaleLowerCase()
      if (currentLens && candidateLens === currentLens) {
        score += 2
        reasons.push('lens')
      }

      const sharedTags = (photo.tags || []).filter((tag) =>
        currentTags.has(tag.toLocaleLowerCase()),
      ).length
      if (sharedTags > 0) {
        score += Math.min(sharedTags * 2, 6)
        reasons.push('tag')
      }

      return {
        photo: sanitizePhotoContent(photo),
        score,
        reasons: [...new Set(reasons)],
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
})
