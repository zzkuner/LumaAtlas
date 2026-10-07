export const LUMAATLAS_BACKUP_VERSION = 1 as const

export interface LumaAtlasBackupSetting {
  namespace: string
  key: string
  type: 'string' | 'number' | 'boolean' | 'json'
  value: string | null
}

export interface LumaAtlasBackupEnvelope {
  format: 'lumaatlas-backup'
  version: typeof LUMAATLAS_BACKUP_VERSION
  createdAt: string
  reason: 'manual' | 'pre-restore'
  counts: {
    photos: number
    albums: number
    albumPhotos: number
    reactions: number
    settings: number
  }
  data: {
    photos: Record<string, unknown>[]
    albums: Record<string, unknown>[]
    albumPhotos: Record<string, unknown>[]
    reactions: Record<string, unknown>[]
    settings: LumaAtlasBackupSetting[]
  }
}

export interface BackupFileSummary {
  filename: string
  createdAt: string
  bytes: number
  reason: 'manual' | 'pre-restore'
  counts: LumaAtlasBackupEnvelope['counts']
}

export interface BackupPreview {
  valid: boolean
  createdAt: string
  version: number
  counts: LumaAtlasBackupEnvelope['counts']
  conflicts: {
    photos: number
    albums: number
    settings: number
  }
}
