import { z } from 'zod'
import { scanStorageForImport } from '~~/server/services/import/storage-scanner'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const { includeUnchanged, previewLimit } = await readValidatedBody(
    event,
    z.object({
      includeUnchanged: z.boolean().optional().default(false),
      previewLimit: z.number().int().min(20).max(500).optional().default(200),
    }).parse,
  )

  const result = await scanStorageForImport(includeUnchanged)

  return {
    ...result,
    items: result.items.slice(0, previewLimit),
    missingItems: result.missingItems.slice(0, previewLimit),
    previewLimit,
    hasMoreItems: result.items.length > previewLimit,
    hasMoreMissingItems: result.missingItems.length > previewLimit,
  }
})
