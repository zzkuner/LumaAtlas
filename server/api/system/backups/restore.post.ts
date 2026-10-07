import { z } from 'zod'
import { ensureAdmin, restoreBackup } from '~~/server/services/backup'

export default eventHandler(async (event) => {
  await ensureAdmin(event)
  const body = await readValidatedBody(
    event,
    z.object({
      mode: z.enum(['merge', 'replace']),
      backup: z.unknown(),
    }).parse,
  )
  return restoreBackup(body.backup, body.mode)
})
