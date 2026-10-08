import { desc, isNotNull } from 'drizzle-orm'
import { getGlobalStorageManager } from '~~/server/services/storage/events'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (!session.user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin required' })
  }

  const manager = getGlobalStorageManager()
  if (!manager) {
    return {
      status: 'unavailable' as const,
      provider: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      message: 'Storage manager is not initialized.',
    }
  }

  const sample = useDB()
    .select({ key: tables.photos.storageKey })
    .from(tables.photos)
    .where(isNotNull(tables.photos.storageKey))
    .orderBy(desc(tables.photos.dateTaken))
    .limit(1)
    .get()
  const startedAt = performance.now()

  try {
    const provider = manager.getProvider()
    const object = sample?.key ? await provider.getFileMeta(sample.key) : null
    return {
      status:
        sample?.key && !object ? ('degraded' as const) : ('healthy' as const),
      provider: manager.getCurrentProviderName() || null,
      latencyMs: Math.round(performance.now() - startedAt),
      checkedAt: new Date().toISOString(),
      sampleChecked: Boolean(sample?.key),
      message:
        sample?.key && !object
          ? 'The provider responded, but the latest stored object was not found.'
          : sample?.key
            ? 'Provider connection and latest object are available.'
            : 'Provider is initialized. Upload a photo to enable object probing.',
    }
  } catch (error) {
    return {
      status: 'unavailable' as const,
      provider: manager.getCurrentProviderName() || null,
      latencyMs: Math.round(performance.now() - startedAt),
      checkedAt: new Date().toISOString(),
      sampleChecked: Boolean(sample?.key),
      message: error instanceof Error ? error.message : 'Storage probe failed.',
    }
  }
})
