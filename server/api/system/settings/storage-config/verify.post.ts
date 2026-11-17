import { r2StorageConfigSchema } from '~~/shared/types/storage'
import { R2StorageProvider } from '~~/server/services/storage/providers/r2'

export default eventHandler(async (event) => {
  await requireAdminSession(event)
  const config = await readValidatedBody(event, r2StorageConfigSchema.parse)
  await new R2StorageProvider(config).probe()
  return { ok: true }
})
