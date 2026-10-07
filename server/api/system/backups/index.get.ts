import { ensureAdmin, listBackups } from '~~/server/services/backup'

export default eventHandler(async (event) => {
  await ensureAdmin(event)
  return listBackups()
})
