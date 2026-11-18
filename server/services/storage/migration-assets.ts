import type { PhotoThumbnailVariant } from '~~/shared/types/photo'
import type { StorageConfig } from '~~/shared/types/storage'
import type { StorageProvider } from './interfaces'
import { storageContentType } from './content-type'

export interface PhotoAssetRow {
  id: string
  storageKey: string | null
  thumbnailKey: string | null
  originalUrl: string | null
  thumbnailUrl: string | null
  thumbnailVariants: PhotoThumbnailVariant[] | null
  livePhotoVideoKey: string | null
  livePhotoVideoUrl: string | null
}

export function migrationTargetConfig(config: StorageConfig): StorageConfig {
  return config.provider === 's3' ? { ...config, prefix: '' } : config
}

export function collectPhotoAssetKeys(rows: PhotoAssetRow[]): string[] {
  const keys = new Set<string>()
  for (const row of rows) {
    for (const key of [
      row.storageKey,
      row.thumbnailKey,
      row.livePhotoVideoKey,
    ]) {
      if (key) keys.add(key)
    }
    for (const variant of row.thumbnailVariants || []) {
      if (variant.key) keys.add(variant.key)
    }
  }
  return [...keys].sort()
}

export async function copyPhotoAsset(
  key: string,
  source: StorageProvider,
  target: StorageProvider,
): Promise<'copied' | 'reused'> {
  const original = await source.get(key)
  if (!original) throw new Error(`源文件不存在：${key}`)

  const existing = await target.get(key)
  if (existing) {
    if (!existing.equals(original)) {
      throw new Error(`目标存储存在同名但内容不同的文件：${key}`)
    }
    return 'reused'
  }

  await target.create(key, original, storageContentType(key))
  const written = await target.get(key)
  if (!written?.equals(original)) {
    throw new Error(`写入后校验失败：${key}`)
  }
  return 'copied'
}
