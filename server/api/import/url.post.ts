import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { downloadRemoteImage } from '~~/server/services/import/remote-image'
import { settingsManager } from '~~/server/services/settings/settingsManager'
import { useStorageProvider } from '~~/server/utils/useStorageProvider'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const { url } = await readValidatedBody(
    event,
    z.object({
      url: z.string().url().max(2048),
    }).parse,
  )
  const workerPool = globalThis.__workerPool
  if (!workerPool) {
    throw createError({
      statusCode: 503,
      statusMessage: '任务处理服务暂不可用。',
    })
  }

  const { storageProvider } = useStorageProvider(event)
  const configuredMax =
    (await settingsManager.get<number>('system', 'upload.maxFileSize')) ?? 256
  const maxBytes = Math.min(configuredMax, 50) * 1024 * 1024
  let image: Awaited<ReturnType<typeof downloadRemoteImage>>
  try {
    image = await downloadRemoteImage(url, maxBytes)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : '图片下载失败。',
    })
  }

  const prefix =
    storageProvider.config && 'prefix' in storageProvider.config
      ? String(storageProvider.config.prefix || '').replace(/^\/+|\/+$/g, '')
      : ''
  let sourceName = ''
  try {
    sourceName = decodeURIComponent(
      new URL(url).pathname.split('/').pop() || '',
    )
  } catch {
    // A malformed filename should not prevent importing a valid image URL.
  }
  const photoName =
    sourceName
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N} _.-]/gu, '-')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 80) || 'online-photo'
  const storageKey = [
    prefix,
    'remote',
    randomUUID(),
    `${photoName}.${image.extension}`,
  ]
    .filter(Boolean)
    .join('/')
  await storageProvider.create(storageKey, image.buffer, image.contentType)
  const taskId = await workerPool.addTask(
    { type: 'photo', storageKey },
    { priority: 1, maxAttempts: 3 },
  )
  return { success: true, storageKey, taskId }
})
