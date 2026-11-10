import { useStorageProvider } from '~~/server/utils/useStorageProvider'
import { logger } from '~~/server/utils/logger'
import { settingsManager } from '~~/server/services/settings/settingsManager'

export default eventHandler(async (event) => {
  await requireAdminSession(event)

  const { storageProvider } = useStorageProvider(event)
  const key = getQuery(event).key as string | undefined
  const t = await useTranslation(event)

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: t('upload.error.required.title'),
      data: {
        title: t('upload.error.required.title'),
        message: t('upload.error.required.message', { field: 'key' }),
      },
    })
  }

  const contentType =
    getHeader(event, 'content-type') || 'application/octet-stream'

  // MIME 类型白名单验证（可通过环境变量配置）
  const config = useRuntimeConfig(event)
  const whitelistEnabled = config.upload.mime.whitelistEnabled

  if (whitelistEnabled) {
    const whitelistStr = config.upload.mime.whitelist
    const allowedTypes = whitelistStr
      ? whitelistStr
          .split(',')
          .map((type: string) => type.trim())
          .filter(Boolean)
      : []

    if (allowedTypes.length > 0 && !allowedTypes.includes(contentType)) {
      throw createError({
        statusCode: 415,
        statusMessage: t('upload.error.invalidType.title'),
        data: {
          title: t('upload.error.invalidType.title'),
          message: t('upload.error.invalidType.message', { type: contentType }),
          suggestion: t('upload.error.invalidType.suggestion', {
            allowed: allowedTypes.join(', '),
          }),
        },
      })
    }
  }

  const maxFileSizeMB =
    (await settingsManager.get<number>('system', 'upload.maxFileSize')) ?? 256
  const maxBytes = maxFileSizeMB * 1024 * 1024
  const declaredLength = Number(getHeader(event, 'content-length'))
  const tooLarge = (size: number) =>
    createError({
      statusCode: 413,
      statusMessage: t('upload.error.tooLarge.title'),
      data: {
        title: t('upload.error.tooLarge.title'),
        message: t('upload.error.tooLarge.message', {
          size: (size / 1024 / 1024).toFixed(2),
        }),
        suggestion: t('upload.error.tooLarge.suggestion', {
          maxSize: maxFileSizeMB,
        }),
      },
    })
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw tooLarge(declaredLength)
  }

  const chunks: Buffer[] = []
  let receivedBytes = 0
  for await (const chunk of event.node.req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    receivedBytes += buffer.byteLength
    if (receivedBytes > maxBytes) {
      throw tooLarge(receivedBytes)
    }
    chunks.push(buffer)
  }
  if (receivedBytes === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: t('upload.error.uploadFailed.title'),
      data: {
        title: t('upload.error.uploadFailed.title'),
        message: t('upload.error.uploadFailed.message'),
      },
    })
  }
  const raw = Buffer.concat(chunks, receivedBytes)

  try {
    await storageProvider.create(key.replace(/^\/+/, ''), raw, contentType)
  } catch (error) {
    logger.chrono.error('Storage provider create error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: t('upload.error.uploadFailed.title'),
      data: {
        title: t('upload.error.uploadFailed.title'),
        message: t('upload.error.uploadFailed.message'),
      },
    })
  }

  return { ok: true, key }
})
