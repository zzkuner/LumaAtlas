import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { downloadRemoteImage } from '~~/server/services/import/remote-image'
import { settingsManager } from '~~/server/services/settings/settingsManager'
import { tables, useDB } from '~~/server/utils/db'
import { useStorageProvider } from '~~/server/utils/useStorageProvider'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const { url, saveToStorage } = await readValidatedBody(
    event,
    z.object({
      url: z.string().url().max(2048),
      saveToStorage: z.boolean().default(true),
    }).parse,
  )
  const workerPool = globalThis.__workerPool
  if (saveToStorage && !workerPool) {
    throw createError({
      statusCode: 503,
      statusMessage: '任务处理服务暂不可用。',
    })
  }

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

  if (!saveToStorage) {
    const existing = useDB()
      .select({ id: tables.photos.id })
      .from(tables.photos)
      .where(
        and(
          eq(tables.photos.originalUrl, url),
          isNull(tables.photos.storageKey),
        ),
      )
      .get()
    if (existing) {
      return {
        success: true,
        photoId: existing.id,
        linked: true,
        existing: true,
      }
    }
    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
      ].includes(image.contentType)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          '仅引用链接时只支持浏览器可直接显示的 JPEG、PNG、WebP、GIF 和 AVIF。',
      })
    }
    const metadata = await sharp(image.buffer)
      .metadata()
      .catch(() => {
        throw createError({
          statusCode: 400,
          statusMessage: '图片内容无法解析，请检查链接是否指向完整的图片文件。',
        })
      })
    const width = metadata.width || null
    const height = metadata.height || null
    const id = randomUUID()
    useDB()
      .insert(tables.photos)
      .values({
        id,
        width,
        height,
        aspectRatio: width && height ? width / height : null,
        dateTaken: new Date().toISOString(),
        fileSize: image.buffer.length,
        originalUrl: url,
        thumbnailUrl: url,
      })
      .run()
    return { success: true, photoId: id, linked: true }
  }

  const { storageProvider } = useStorageProvider(event)

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
  const taskId = await workerPool!.addTask(
    { type: 'photo', storageKey },
    { priority: 1, maxAttempts: 3 },
  )
  return { success: true, storageKey, taskId }
})
