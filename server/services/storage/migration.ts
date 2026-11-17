import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { tables, useDB } from '~~/server/utils/db'
import { settingsManager } from '~~/server/services/settings/settingsManager'
import type { StorageProvider } from './interfaces'
import { StorageProviderFactory } from './manager'
import {
  collectPhotoAssetKeys,
  copyPhotoAsset,
  type PhotoAssetRow,
} from './migration-assets'

type MigrationStage = 'copying' | 'copied' | 'verifying' | 'complete' | 'failed'

export interface StorageMigrationStatus {
  id: string
  sourceProviderId: number
  targetProviderId: number
  targetName: string
  stage: MigrationStage
  total: number
  processed: number
  copied: number
  reused: number
  error: string | null
}

interface MigrationJob {
  status: StorageMigrationStatus
  keys: string[]
  sourceConfig: string
  targetConfig: string
}

let currentJob: MigrationJob | null = null
let starting = false

function loadPhotoAssets(): PhotoAssetRow[] {
  return useDB()
    .select({
      id: tables.photos.id,
      storageKey: tables.photos.storageKey,
      thumbnailKey: tables.photos.thumbnailKey,
      originalUrl: tables.photos.originalUrl,
      thumbnailUrl: tables.photos.thumbnailUrl,
      thumbnailVariants: tables.photos.thumbnailVariants,
      livePhotoVideoKey: tables.photos.livePhotoVideoKey,
      livePhotoVideoUrl: tables.photos.livePhotoVideoUrl,
    })
    .from(tables.photos)
    .all()
}

export function getStorageMigrationStatus(): StorageMigrationStatus | null {
  return currentJob ? { ...currentJob.status } : null
}

export async function startStorageMigration(
  targetProviderId: number,
): Promise<StorageMigrationStatus> {
  if (
    starting ||
    (currentJob && ['copying', 'verifying'].includes(currentJob.status.stage))
  ) {
    throw new Error('已有迁移任务正在运行')
  }

  starting = true
  try {
    const source = await settingsManager.storage.getActiveProvider()
    const target =
      await settingsManager.storage.getProviderById(targetProviderId)
    if (
      !source ||
      !target ||
      target.provider !== 'r2' ||
      source.id === target.id
    ) {
      throw new Error('请选择非当前使用的 R2 存储方案')
    }

    const keys = collectPhotoAssetKeys(loadPhotoAssets())
    const job: MigrationJob = {
      status: {
        id: randomUUID(),
        sourceProviderId: source.id,
        targetProviderId: target.id,
        targetName: target.name,
        stage: 'copying',
        total: keys.length,
        processed: 0,
        copied: 0,
        reused: 0,
        error: null,
      },
      keys,
      sourceConfig: JSON.stringify(source.config),
      targetConfig: JSON.stringify(target.config),
    }
    currentJob = job
    void (async () => {
      try {
        const sourceProvider = StorageProviderFactory.createProvider(
          source.config,
        )
        const targetProvider = StorageProviderFactory.createProvider(
          target.config,
        )
        if (
          !('probe' in targetProvider) ||
          typeof targetProvider.probe !== 'function'
        ) {
          throw new Error('目标存储不支持连接检测')
        }
        await targetProvider.probe()
        for (const key of keys) {
          const outcome = await copyPhotoAsset(
            key,
            sourceProvider,
            targetProvider,
          )
          job.status[outcome]++
          job.status.processed++
        }
        job.status.stage = 'copied'
      } catch (error) {
        job.status.stage = 'failed'
        job.status.error = error instanceof Error ? error.message : '迁移失败'
      }
    })()
    return { ...job.status }
  } finally {
    starting = false
  }
}

function updatePhotoUrls(rows: PhotoAssetRow[], target: StorageProvider): void {
  useDB().transaction((transaction) => {
    for (const row of rows) {
      transaction
        .update(tables.photos)
        .set({
          originalUrl: row.storageKey
            ? target.getPublicUrl(row.storageKey)
            : row.originalUrl,
          thumbnailUrl: row.thumbnailKey
            ? target.getPublicUrl(row.thumbnailKey)
            : row.thumbnailUrl,
          thumbnailVariants: row.thumbnailVariants?.map((variant) => ({
            ...variant,
            url: variant.key ? target.getPublicUrl(variant.key) : variant.url,
          })),
          livePhotoVideoUrl: row.livePhotoVideoKey
            ? target.getPublicUrl(row.livePhotoVideoKey)
            : row.livePhotoVideoUrl,
        })
        .where(eq(tables.photos.id, row.id))
        .run()
    }
  })
}

function restorePhotoUrls(rows: PhotoAssetRow[]): void {
  useDB().transaction((transaction) => {
    for (const row of rows) {
      transaction
        .update(tables.photos)
        .set({
          originalUrl: row.originalUrl,
          thumbnailUrl: row.thumbnailUrl,
          thumbnailVariants: row.thumbnailVariants,
          livePhotoVideoUrl: row.livePhotoVideoUrl,
        })
        .where(eq(tables.photos.id, row.id))
        .run()
    }
  })
}

export function activateStorageMigration(
  jobId: string,
): StorageMigrationStatus {
  const job = currentJob
  if (!job || job.status.id !== jobId || job.status.stage !== 'copied') {
    throw new Error('请先完成文件复制与校验')
  }

  job.status.stage = 'verifying'
  void (async () => {
    try {
      const source = await settingsManager.storage.getActiveProvider()
      const target = await settingsManager.storage.getProviderById(
        job.status.targetProviderId,
      )
      if (
        !source ||
        !target ||
        source.id !== job.status.sourceProviderId ||
        JSON.stringify(source.config) !== job.sourceConfig ||
        JSON.stringify(target.config) !== job.targetConfig
      ) {
        throw new Error('存储方案已变化，请重新运行迁移')
      }

      const rows = loadPhotoAssets()
      if (
        JSON.stringify(collectPhotoAssetKeys(rows)) !== JSON.stringify(job.keys)
      ) {
        throw new Error('迁移期间照片文件发生变化，请重新运行迁移')
      }

      const sourceProvider = StorageProviderFactory.createProvider(
        source.config,
      )
      const targetProvider = StorageProviderFactory.createProvider(
        target.config,
      )
      for (const key of job.keys) {
        const original = await sourceProvider.get(key)
        const copied = await targetProvider.get(key)
        if (!original || !copied?.equals(original)) {
          throw new Error(`目标文件校验失败：${key}`)
        }
      }

      if (
        JSON.stringify(collectPhotoAssetKeys(loadPhotoAssets())) !==
        JSON.stringify(job.keys)
      ) {
        throw new Error('校验期间照片文件发生变化，请重新运行迁移')
      }

      updatePhotoUrls(rows, targetProvider)
      try {
        await settingsManager.set('storage', 'provider', target.id)
      } catch (error) {
        restorePhotoUrls(rows)
        throw error
      }
      job.status.stage = 'complete'
    } catch (error) {
      job.status.stage = 'failed'
      job.status.error = error instanceof Error ? error.message : '切换失败'
    }
  })()
  return { ...job.status }
}
