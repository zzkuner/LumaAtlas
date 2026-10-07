import { ensureAdmin, previewBackup } from '~~/server/services/backup'

export default eventHandler(async (event) => {
  await ensureAdmin(event)
  return previewBackup(await readBody(event))
})
