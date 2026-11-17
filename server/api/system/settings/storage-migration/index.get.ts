import { getStorageMigrationStatus } from '~~/server/services/storage/migration'

export default eventHandler(async (event) => {
  await requireAdminSession(event)
  return getStorageMigrationStatus()
})
