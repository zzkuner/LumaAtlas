import { z } from 'zod'
import { startStorageMigration } from '~~/server/services/storage/migration'

export default eventHandler(async (event) => {
  await requireAdminSession(event)
  const { targetProviderId } = await readValidatedBody(
    event,
    z.object({ targetProviderId: z.number().int().positive() }).parse,
  )
  return startStorageMigration(targetProviderId)
})
