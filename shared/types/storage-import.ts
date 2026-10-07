export type StorageImportItemStatus = 'new' | 'updated' | 'unchanged' | 'queued'

export interface StorageImportItem {
  key: string
  size: number | null
  lastModified: string | null
  status: StorageImportItemStatus
  importable: boolean
  photoId: string | null
}

export interface MissingStorageItem {
  photoId: string
  key: string
  title: string | null
}

export interface StorageImportSummary {
  total: number
  new: number
  updated: number
  unchanged: number
  queued: number
  missing: number
  importable: number
}

export interface StorageImportScanResult {
  provider: string | null
  scannedAt: string
  includeUnchanged: boolean
  summary: StorageImportSummary
  items: StorageImportItem[]
  missingItems: MissingStorageItem[]
  previewLimit: number
  hasMoreItems: boolean
  hasMoreMissingItems: boolean
}

export interface StorageImportEnqueueResult {
  success: boolean
  eligibleCount: number
  enqueuedCount: number
  failedCount: number
  remainingCount: number
  taskIds: number[]
  errors: Array<{ key: string; message: string }>
}
