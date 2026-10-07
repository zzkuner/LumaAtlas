import { z } from 'zod'
import { scanStorageForImport } from '~~/server/services/import/storage-scanner'
import type { StorageImportEnqueueResult } from '~~/shared/types/storage-import'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const { includeUnchanged, batchSize } = await readValidatedBody(
    event,
    z.object({
      includeUnchanged: z.boolean().optional().default(false),
      batchSize: z.number().int().min(1).max(1000).optional().default(500),
    }).parse,
  )

  const workerPool = globalThis.__workerPool
  if (!workerPool) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Worker pool not initialized',
    })
  }

  const scan = await scanStorageForImport(includeUnchanged)
  const eligibleItems = scan.items.filter((item) => item.importable)
  const batch = includeUnchanged
    ? eligibleItems
    : eligibleItems.slice(0, batchSize)
  const taskIds: number[] = []
  const errors: Array<{ key: string; message: string }> = []

  for (const item of batch) {
    try {
      taskIds.push(
        await workerPool.addTask(
          { type: 'photo', storageKey: item.key },
          { priority: 0, maxAttempts: 3 },
        ),
      )
    } catch (error) {
      errors.push({
        key: item.key,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const result: StorageImportEnqueueResult = {
    success: errors.length === 0,
    eligibleCount: eligibleItems.length,
    enqueuedCount: taskIds.length,
    failedCount: errors.length,
    remainingCount: Math.max(0, eligibleItems.length - batch.length),
    taskIds,
    errors,
  }

  return result
})
