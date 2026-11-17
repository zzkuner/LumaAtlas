import { z } from 'zod'
import { activateStorageMigration } from '~~/server/services/storage/migration'

export default eventHandler(async (event) => {
  await requireAdminSession(event)
  const { jobId } = await readValidatedBody(
    event,
    z.object({ jobId: z.uuid() }).parse,
  )
  return activateStorageMigration(jobId)
})
