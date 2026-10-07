import { ensureAdmin, readBackupFile } from '~~/server/services/backup'

export default eventHandler(async (event) => {
  await ensureAdmin(event)
  const filename = getRouterParam(event, 'filename') || ''
  const { content } = await readBackupFile(filename)
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  )
  return content
})
