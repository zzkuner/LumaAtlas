import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { exiftool } from 'exiftool-vendored'
import { eq } from 'drizzle-orm'

import { extractExifData } from '~~/server/services/image/exif'
import { tables, useDB } from '~~/server/utils/db'
import { useStorageProvider } from '~~/server/utils/useStorageProvider'

const paramsSchema = z.object({
  photoId: z.string().min(1),
})

const bodySchema = z.object({
  title: z.string().trim().max(512).optional(),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().max(128)).max(64).optional(),
  location: z
    .union([
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
      z.null(),
    ])
    .optional(),
  rating: z.union([z.number().int().min(0).max(5), z.null()]).optional(),
  exposure: z
    .object({
      fNumber: z.number().min(0.1).max(128).nullable(),
      exposureTime: z
        .string()
        .regex(/^(?:\d+(?:\.\d+)?|\d+\/\d+)$/)
        .nullable(),
      iso: z.number().int().min(1).max(10000000).nullable(),
      focalLength: z.number().min(0.1).max(2000).nullable(),
      cameraModel: z.string().trim().max(200).nullable(),
    })
    .optional(),
})

const normalizeTags = (tags: string[] | undefined) => {
  if (!tags) return undefined
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const rawTag of tags) {
    const trimmed = rawTag.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(trimmed)
  }
  return normalized
}

export default eventHandler(async (event) => {
  await requireAdminSession(event)

  const t = await useTranslation(event)
  const { photoId } = paramsSchema.parse(event.context.params ?? {})
  const payload = bodySchema.parse(await readBody(event))

  if (
    payload.title === undefined &&
    payload.description === undefined &&
    payload.tags === undefined &&
    payload.location === undefined &&
    payload.rating === undefined &&
    payload.exposure === undefined
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: t('dashboard.photos.messages.noChangesProvided'),
    })
  }

  const db = useDB()
  const photo = await db
    .select()
    .from(tables.photos)
    .where(eq(tables.photos.id, photoId))
    .get()

  if (!photo) {
    throw createError({
      statusCode: 404,
      statusMessage: t('dashboard.photos.messages.photoNotFound'),
    })
  }

  if (!photo.storageKey && photo.originalUrl) {
    const nextExif = { ...photo.exif }
    if (payload.rating !== undefined)
      nextExif.Rating = payload.rating ?? undefined
    if (payload.exposure) {
      nextExif.FNumber = payload.exposure.fNumber ?? undefined
      nextExif.ExposureTime = payload.exposure.exposureTime ?? undefined
      nextExif.ISO = payload.exposure.iso ?? undefined
      nextExif.FocalLength =
        payload.exposure.focalLength == null
          ? undefined
          : String(payload.exposure.focalLength)
      nextExif.FocalLengthIn35mmFormat =
        payload.exposure.focalLength == null
          ? undefined
          : String(payload.exposure.focalLength)
      nextExif.Model = payload.exposure.cameraModel ?? undefined
    }
    const updates: Record<string, any> = { exif: nextExif }
    if (payload.title !== undefined) updates.title = payload.title || null
    if (payload.description !== undefined)
      updates.description = payload.description || null
    if (payload.tags !== undefined) updates.tags = normalizeTags(payload.tags)
    if (payload.location !== undefined) {
      updates.latitude = payload.location?.latitude ?? null
      updates.longitude = payload.location?.longitude ?? null
      updates.country = null
      updates.city = null
      updates.locationName = null
    }
    db.update(tables.photos)
      .set(updates)
      .where(eq(tables.photos.id, photoId))
      .run()
    return db
      .select()
      .from(tables.photos)
      .where(eq(tables.photos.id, photoId))
      .get()
  }

  if (!photo.storageKey) {
    throw createError({
      statusCode: 400,
      statusMessage: t('dashboard.photos.messages.noStorageKey'),
    })
  }

  const { storageProvider } = useStorageProvider(event)
  const originalBuffer = await storageProvider.get(photo.storageKey)

  if (!originalBuffer) {
    throw createError({
      statusCode: 404,
      statusMessage: t('dashboard.photos.messages.photoFileMissing'),
    })
  }

  const normalizedTitle =
    payload.title !== undefined ? payload.title.trim() : undefined
  const normalizedDescription =
    payload.description !== undefined ? payload.description.trim() : undefined
  const normalizedTags = normalizeTags(payload.tags)
  let pendingReverseGeocode: {
    latitude: number
    longitude: number
  } | null = null

  const exifUpdates: Record<string, any> = {}

  if (normalizedTitle !== undefined) {
    const titleValue = normalizedTitle.length > 0 ? normalizedTitle : null
    exifUpdates.Title = titleValue
    exifUpdates.XPTitle = titleValue
  }

  if (normalizedDescription !== undefined) {
    const descriptionValue =
      normalizedDescription.length > 0 ? normalizedDescription : null
    exifUpdates.Description = descriptionValue
    exifUpdates.ImageDescription = descriptionValue
    exifUpdates.CaptionAbstract = descriptionValue
    exifUpdates.XPComment = descriptionValue
    exifUpdates.UserComment = descriptionValue
  }

  if (normalizedTags !== undefined) {
    const tagsValue = normalizedTags.length > 0 ? normalizedTags : null
    exifUpdates.Subject = tagsValue
    exifUpdates.Keywords = tagsValue
    exifUpdates.XPKeywords =
      normalizedTags.length > 0 ? normalizedTags.join('; ') : null
  }

  if (payload.location !== undefined) {
    if (payload.location) {
      const { latitude, longitude } = payload.location
      const latAbs = Math.abs(latitude)
      const lonAbs = Math.abs(longitude)
      exifUpdates.GPSLatitude = latAbs
      exifUpdates.GPSLatitudeRef = latitude >= 0 ? 'N' : 'S'
      exifUpdates.GPSLongitude = lonAbs
      exifUpdates.GPSLongitudeRef = longitude >= 0 ? 'E' : 'W'
      exifUpdates.GPSPosition = `${latitude} ${longitude}`
    } else {
      exifUpdates.GPSLatitude = null
      exifUpdates.GPSLatitudeRef = null
      exifUpdates.GPSLongitude = null
      exifUpdates.GPSLongitudeRef = null
      exifUpdates.GPSPosition = null
    }
  }

  if (payload.rating !== undefined) {
    exifUpdates.Rating = payload.rating !== null ? payload.rating : null
  }

  if (payload.exposure) {
    exifUpdates.FNumber = payload.exposure.fNumber
    exifUpdates.ExposureTime = payload.exposure.exposureTime
    exifUpdates.ISO = payload.exposure.iso
    exifUpdates.FocalLength = payload.exposure.focalLength
    exifUpdates.Model = payload.exposure.cameraModel
  }

  const tempRoot = tmpdir()
  await mkdir(tempRoot, { recursive: true })
  const tempDir = await mkdtemp(path.join(tempRoot, 'cframe-edit-'))
  const ext = path.extname(photo.storageKey) || '.jpg'
  const tempFile = path.join(tempDir, `edited${ext}`)
  let storageWasReplaced = false
  let databaseWasUpdated = false

  try {
    await writeFile(tempFile, originalBuffer)

    if (Object.keys(exifUpdates).length > 0) {
      await exiftool.write(tempFile, exifUpdates, ['-overwrite_original'])
    }

    const updatedBuffer = await readFile(tempFile)
    const prefix =
      storageProvider.config && 'prefix' in storageProvider.config
        ? storageProvider.config.prefix
        : ''
    await storageProvider.create(
      photo.storageKey.replace(prefix || '', ''),
      updatedBuffer,
    )
    storageWasReplaced = true

    const exifData = await extractExifData(updatedBuffer)

    const updateData: Record<string, any> = {
      exif: payload.exposure
        ? {
            ...exifData,
            FNumber: payload.exposure.fNumber ?? undefined,
            ExposureTime: payload.exposure.exposureTime ?? undefined,
            ISO: payload.exposure.iso ?? undefined,
            FocalLength:
              payload.exposure.focalLength == null
                ? undefined
                : String(payload.exposure.focalLength),
            FocalLengthIn35mmFormat:
              payload.exposure.focalLength == null
                ? undefined
                : String(payload.exposure.focalLength),
            Model: payload.exposure.cameraModel ?? undefined,
          }
        : exifData,
      fileSize: updatedBuffer.length,
      lastModified: new Date().toISOString(),
    }

    if (normalizedTitle !== undefined) {
      updateData.title = normalizedTitle || null
    }

    if (normalizedDescription !== undefined) {
      updateData.description = normalizedDescription || null
    }

    if (normalizedTags !== undefined) {
      updateData.tags = normalizedTags
    }

    if (payload.location !== undefined) {
      if (payload.location) {
        updateData.latitude = payload.location.latitude
        updateData.longitude = payload.location.longitude
        updateData.country = null
        updateData.city = null
        updateData.locationName = null
        pendingReverseGeocode = {
          latitude: payload.location.latitude,
          longitude: payload.location.longitude,
        }
      } else {
        updateData.latitude = null
        updateData.longitude = null
        updateData.country = null
        updateData.city = null
        updateData.locationName = null
      }
    }

    db.update(tables.photos)
      .set(updateData)
      .where(eq(tables.photos.id, photoId))
      .run()
    databaseWasUpdated = true

    const updatedPhoto = await db
      .select()
      .from(tables.photos)
      .where(eq(tables.photos.id, photoId))
      .get()

    if (pendingReverseGeocode) {
      const workerPool = globalThis.__workerPool
      if (workerPool) {
        try {
          await workerPool.addTask(
            {
              type: 'photo-reverse-geocoding',
              photoId,
              latitude: pendingReverseGeocode.latitude,
              longitude: pendingReverseGeocode.longitude,
            },
            {
              priority: 1,
            },
          )
        } catch (taskError) {
          logger.location.warn(
            `Failed to enqueue reverse geocoding for photo ${photoId}:`,
            taskError,
          )
        }
      } else {
        logger.location.warn(
          `Worker pool not initialized, skipping reverse geocoding enqueue for photo ${photoId}`,
        )
      }
    }

    return {
      success: true,
      photo: updatedPhoto,
    }
  } catch (error) {
    if (storageWasReplaced && !databaseWasUpdated) {
      try {
        const prefix =
          storageProvider.config && 'prefix' in storageProvider.config
            ? storageProvider.config.prefix
            : ''
        await storageProvider.create(
          photo.storageKey.replace(prefix || '', ''),
          originalBuffer,
        )
      } catch (rollbackError) {
        logger.image.error(
          `Failed to restore original file for photo ${photoId}`,
          rollbackError,
        )
      }
    }
    logger.image.error('Failed to update photo metadata', error)
    throw createError({
      statusCode: 500,
      statusMessage: t('dashboard.photos.messages.metadataUpdateFailed'),
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
