import { inArray } from 'drizzle-orm'
import type {
  MissingStorageItem,
  StorageImportItem,
  StorageImportScanResult,
  StorageImportSummary,
} from '~~/shared/types/storage-import'
import { getStorageManager } from '~~/server/plugins/3.storage'

const GENERATED_PATH_PATTERN = /(^|\/)(thumbnails|derivatives)(\/|$)/i

const isRemoteObjectUpdated = (
  object: { size?: number; lastModified?: Date },
  photo: { fileSize: number | null; lastModified: string | null },
): boolean => {
  if (
    object.size !== undefined &&
    photo.fileSize !== null &&
    object.size !== photo.fileSize
  ) {
    return true
  }

  if (!object.lastModified) return false
  const storedTimestamp = photo.lastModified
    ? Date.parse(photo.lastModified)
    : Number.NaN

  return (
    !Number.isFinite(storedTimestamp) ||
    object.lastModified.getTime() > storedTimestamp + 1000
  )
}

export const scanStorageForImport = async (
  includeUnchanged = false,
): Promise<
  Omit<
    StorageImportScanResult,
    'previewLimit' | 'hasMoreItems' | 'hasMoreMissingItems'
  >
> => {
  const storageManager = getStorageManager()
  const storageProvider = storageManager.getProvider()
  const db = useDB()

  const [listedObjects, photos, activeTasks] = await Promise.all([
    storageProvider.listImages(),
    db
      .select({
        id: tables.photos.id,
        title: tables.photos.title,
        storageKey: tables.photos.storageKey,
        thumbnailKey: tables.photos.thumbnailKey,
        originalUrl: tables.photos.originalUrl,
        fileSize: tables.photos.fileSize,
        lastModified: tables.photos.lastModified,
        livePhotoVideoKey: tables.photos.livePhotoVideoKey,
      })
      .from(tables.photos),
    db
      .select({ payload: tables.pipelineQueue.payload })
      .from(tables.pipelineQueue)
      .where(inArray(tables.pipelineQueue.status, ['pending', 'in-stages'])),
  ])

  const photoByStorageKey = new Map(
    photos
      .filter((photo) => photo.storageKey)
      .map((photo) => [photo.storageKey!, photo]),
  )
  const photoStorageKeyByOriginalUrl = new Map(
    photos
      .filter((photo) => photo.originalUrl && photo.storageKey)
      .map((photo) => [photo.originalUrl!, photo.storageKey!]),
  )
  const activeStorageKeys = new Set(
    activeTasks
      .filter((task) => task.payload.type === 'photo')
      .map((task) =>
        task.payload.type === 'photo' ? task.payload.storageKey : '',
      )
      .filter(Boolean),
  )

  const knownGeneratedKeys = new Set<string>()
  for (const photo of photos) {
    if (photo.thumbnailKey) knownGeneratedKeys.add(photo.thumbnailKey)
    if (photo.livePhotoVideoKey) knownGeneratedKeys.add(photo.livePhotoVideoKey)
  }

  const uniqueObjects = new Map(
    listedObjects
      .filter(
        (object) => object.key && !GENERATED_PATH_PATTERN.test(object.key),
      )
      .map((object) => [object.key, object]),
  )

  for (const object of uniqueObjects.values()) {
    const publicUrl = storageProvider.getPublicUrl(object.key)
    const sourceStorageKey = photoStorageKeyByOriginalUrl.get(publicUrl)
    if (sourceStorageKey && sourceStorageKey !== object.key) {
      knownGeneratedKeys.add(object.key)
    }
  }

  const items: StorageImportItem[] = []
  const storageKeys = new Set<string>()

  for (const object of uniqueObjects.values()) {
    if (knownGeneratedKeys.has(object.key)) continue

    storageKeys.add(object.key)
    const existingPhoto = photoByStorageKey.get(object.key)
    const status = activeStorageKeys.has(object.key)
      ? 'queued'
      : !existingPhoto
        ? 'new'
        : isRemoteObjectUpdated(object, existingPhoto)
          ? 'updated'
          : 'unchanged'

    items.push({
      key: object.key,
      size: object.size ?? null,
      lastModified: object.lastModified?.toISOString() ?? null,
      status,
      importable:
        status === 'new' ||
        status === 'updated' ||
        (includeUnchanged && status === 'unchanged'),
      photoId: existingPhoto?.id ?? null,
    })
  }

  const statusOrder = { new: 0, updated: 1, queued: 2, unchanged: 3 }
  items.sort(
    (left, right) =>
      statusOrder[left.status] - statusOrder[right.status] ||
      left.key.localeCompare(right.key),
  )

  const missingItems: MissingStorageItem[] = photos
    .filter(
      (photo) =>
        photo.storageKey &&
        !storageKeys.has(photo.storageKey) &&
        !activeStorageKeys.has(photo.storageKey),
    )
    .map((photo) => ({
      photoId: photo.id,
      key: photo.storageKey!,
      title: photo.title,
    }))
    .sort((left, right) => left.key.localeCompare(right.key))

  const summary: StorageImportSummary = {
    total: items.length,
    new: items.filter((item) => item.status === 'new').length,
    updated: items.filter((item) => item.status === 'updated').length,
    unchanged: items.filter((item) => item.status === 'unchanged').length,
    queued: items.filter((item) => item.status === 'queued').length,
    missing: missingItems.length,
    importable: items.filter((item) => item.importable).length,
  }

  return {
    provider: storageManager.getCurrentProviderName() ?? null,
    scannedAt: new Date().toISOString(),
    includeUnchanged,
    summary,
    items,
    missingItems,
  }
}
