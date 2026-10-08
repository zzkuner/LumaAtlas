import { sql } from 'drizzle-orm'
import { getGlobalStorageManager } from '~~/server/services/storage/events'

export default eventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const startedAt = performance.now()

  try {
    useDB().run(sql`select 1`)
    const storageManager = getGlobalStorageManager()
    return {
      status: 'ok',
      database: 'ok',
      storage: storageManager?.getCurrentProviderName() || 'initializing',
      version: useRuntimeConfig(event).public.VERSION,
      responseTimeMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
    }
  } catch {
    setResponseStatus(event, 503)
    return {
      status: 'unavailable',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    }
  }
})
