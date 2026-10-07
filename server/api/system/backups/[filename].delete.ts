import { deleteBackupFile, ensureAdmin } from '~~/server/services/backup'

export default eventHandler(async (event) => {
  await ensureAdmin(event)
  await deleteBackupFile(getRouterParam(event, 'filename') || '')
  return { success: true }
})
