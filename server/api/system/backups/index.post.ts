import { createBackup, ensureAdmin } from '~~/server/services/backup'

export default eventHandler(async (event) => {
  await ensureAdmin(event)
  return createBackup('manual')
})
