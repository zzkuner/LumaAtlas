import fs from 'node:fs/promises'
import path from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import {
  LUMAATLAS_BACKUP_VERSION,
  type BackupFileSummary,
  type BackupPreview,
  type LumaAtlasBackupEnvelope,
  type LumaAtlasBackupSetting,
} from '~~/shared/types/backup'
import { settingsManager } from '../settings/settingsManager'

const BACKUP_DIRECTORY = path.resolve(process.cwd(), 'data', 'backups')

const ensureAdmin = async (event: H3Event) => {
  const session = await requireUserSession(event)
  if (!session.user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin privileges required',
    })
  }
  return session
}

const toBackupFilename = (reason: LumaAtlasBackupEnvelope['reason']) => {
  const timestamp = new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replaceAll('.', '-')
  return `lumaatlas-${reason}-${timestamp}.json`
}

const resolveBackupPath = (filename: string) => {
  const safeName = path.basename(filename)
  if (
    safeName !== filename ||
    !safeName.startsWith('lumaatlas-') ||
    !safeName.endsWith('.json')
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid backup filename',
    })
  }
  return path.join(BACKUP_DIRECTORY, safeName)
}

const normalizeDate = (value: unknown, fallback = new Date()) => {
  const date = value instanceof Date ? value : new Date(String(value || ''))
  return Number.isNaN(date.getTime()) ? fallback : date
}

const readEnvelope = (value: unknown): LumaAtlasBackupEnvelope => {
  if (!value || typeof value !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backup must be a JSON object',
    })
  }

  const envelope = value as Partial<LumaAtlasBackupEnvelope>
  if (envelope.format !== 'lumaatlas-backup') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported backup format',
    })
  }
  if (envelope.version !== LUMAATLAS_BACKUP_VERSION) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported backup version: ${envelope.version}`,
    })
  }
  if (!envelope.data || !envelope.counts) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backup payload is incomplete',
    })
  }

  const collections = [
    'photos',
    'albums',
    'albumPhotos',
    'reactions',
    'settings',
  ] as const
  for (const collection of collections) {
    if (!Array.isArray(envelope.data[collection])) {
      throw createError({
        statusCode: 400,
        statusMessage: `Backup collection ${collection} is invalid`,
      })
    }
  }

  for (const photo of envelope.data.photos) {
    if (!photo || typeof photo.id !== 'string' || !photo.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Backup contains a photo without a valid id',
      })
    }
  }
  for (const album of envelope.data.albums) {
    if (
      !album ||
      !Number.isInteger(album.id) ||
      typeof album.title !== 'string'
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Backup contains an invalid album',
      })
    }
  }

  return envelope as LumaAtlasBackupEnvelope
}

const createEnvelope = (): LumaAtlasBackupEnvelope => {
  const db = useDB()
  const settings = db
    .select()
    .from(tables.settings)
    .all()
    .filter(
      (setting) =>
        !setting.isSecret &&
        !setting.isReadonly &&
        setting.namespace !== 'storage',
    )
    .map<LumaAtlasBackupSetting>((setting) => ({
      namespace: setting.namespace,
      key: setting.key,
      type: setting.type,
      value: setting.value,
    }))
  const photos = db.select().from(tables.photos).all()
  const albums = db.select().from(tables.albums).all()
  const albumPhotos = db.select().from(tables.albumPhotos).all()
  const reactions = db.select().from(tables.photoReactions).all()

  return {
    format: 'lumaatlas-backup',
    version: LUMAATLAS_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    reason: 'manual',
    counts: {
      photos: photos.length,
      albums: albums.length,
      albumPhotos: albumPhotos.length,
      reactions: reactions.length,
      settings: settings.length,
    },
    data: { photos, albums, albumPhotos, reactions, settings },
  }
}

export const createBackup = async (
  reason: LumaAtlasBackupEnvelope['reason'] = 'manual',
) => {
  const envelope = createEnvelope()
  envelope.reason = reason
  const filename = toBackupFilename(reason)
  const filePath = resolveBackupPath(filename)
  const temporaryPath = `${filePath}.tmp`
  const content = JSON.stringify(envelope, null, 2)

  await fs.mkdir(BACKUP_DIRECTORY, { recursive: true })
  await fs.writeFile(temporaryPath, content, 'utf8')
  await fs.rename(temporaryPath, filePath)

  return {
    backup: envelope,
    file: {
      filename,
      createdAt: envelope.createdAt,
      bytes: Buffer.byteLength(content),
      reason,
      counts: envelope.counts,
    } satisfies BackupFileSummary,
  }
}

export const listBackups = async (): Promise<BackupFileSummary[]> => {
  await fs.mkdir(BACKUP_DIRECTORY, { recursive: true })
  const filenames = (await fs.readdir(BACKUP_DIRECTORY)).filter(
    (filename) =>
      filename.startsWith('lumaatlas-') && filename.endsWith('.json'),
  )

  const summaries = await Promise.all(
    filenames.map(async (filename) => {
      try {
        const filePath = resolveBackupPath(filename)
        const [stat, content] = await Promise.all([
          fs.stat(filePath),
          fs.readFile(filePath, 'utf8'),
        ])
        const envelope = readEnvelope(JSON.parse(content))
        return {
          filename,
          createdAt: envelope.createdAt,
          bytes: stat.size,
          reason: envelope.reason,
          counts: envelope.counts,
        } satisfies BackupFileSummary
      } catch {
        return null
      }
    }),
  )

  return summaries
    .filter((summary): summary is BackupFileSummary => summary !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export const readBackupFile = async (filename: string) => {
  const content = await fs.readFile(resolveBackupPath(filename), 'utf8')
  return { content, envelope: readEnvelope(JSON.parse(content)) }
}

export const deleteBackupFile = async (filename: string) => {
  await fs.unlink(resolveBackupPath(filename))
}

export const previewBackup = (input: unknown): BackupPreview => {
  const envelope = readEnvelope(input)
  const db = useDB()
  const photoIds = envelope.data.photos.map((photo) => String(photo.id))
  const albumIds = envelope.data.albums.map((album) => Number(album.id))
  const existingPhotos = photoIds.length
    ? db
        .select({ id: tables.photos.id })
        .from(tables.photos)
        .where(inArray(tables.photos.id, photoIds))
        .all().length
    : 0
  const existingAlbums = albumIds.length
    ? db
        .select({ id: tables.albums.id })
        .from(tables.albums)
        .where(inArray(tables.albums.id, albumIds))
        .all().length
    : 0
  const currentSettings = new Set(
    db
      .select({
        namespace: tables.settings.namespace,
        key: tables.settings.key,
      })
      .from(tables.settings)
      .all()
      .map((setting) => `${setting.namespace}:${setting.key}`),
  )

  return {
    valid: true,
    createdAt: envelope.createdAt,
    version: envelope.version,
    counts: envelope.counts,
    conflicts: {
      photos: existingPhotos,
      albums: existingAlbums,
      settings: envelope.data.settings.filter((setting) =>
        currentSettings.has(`${setting.namespace}:${setting.key}`),
      ).length,
    },
  }
}

export const restoreBackup = async (
  input: unknown,
  mode: 'merge' | 'replace',
) => {
  const envelope = readEnvelope(input)
  const snapshot = await createBackup('pre-restore')
  const db = useDB()

  db.transaction((tx) => {
    if (mode === 'replace') {
      tx.delete(tables.albumPhotos).run()
      tx.delete(tables.photoReactions).run()
      tx.delete(tables.albums).run()
      tx.delete(tables.photos).run()
    }

    for (const value of envelope.data.photos) {
      const photo = value as typeof tables.photos.$inferInsert
      tx.insert(tables.photos)
        .values(photo)
        .onConflictDoUpdate({ target: tables.photos.id, set: photo })
        .run()
    }

    for (const value of envelope.data.albums) {
      const raw = value as Record<string, unknown>
      const album = {
        ...raw,
        createdAt: normalizeDate(raw.createdAt),
        updatedAt: normalizeDate(raw.updatedAt),
      } as typeof tables.albums.$inferInsert
      tx.insert(tables.albums)
        .values(album)
        .onConflictDoUpdate({ target: tables.albums.id, set: album })
        .run()
    }

    const restoredAlbumIds = envelope.data.albums.map((album) =>
      Number(album.id),
    )
    if (mode === 'merge' && restoredAlbumIds.length > 0) {
      tx.delete(tables.albumPhotos)
        .where(inArray(tables.albumPhotos.albumId, restoredAlbumIds))
        .run()
    }
    for (const value of envelope.data.albumPhotos) {
      const raw = value as Record<string, unknown>
      tx.insert(tables.albumPhotos)
        .values({
          albumId: Number(raw.albumId),
          photoId: String(raw.photoId),
          position: Number(raw.position || 1000000),
          addedAt: normalizeDate(raw.addedAt),
        })
        .run()
    }

    for (const value of envelope.data.reactions) {
      const raw = value as Record<string, unknown>
      const reaction = {
        ...raw,
        createdAt: normalizeDate(raw.createdAt),
        updatedAt: normalizeDate(raw.updatedAt),
      } as typeof tables.photoReactions.$inferInsert
      tx.insert(tables.photoReactions)
        .values(reaction)
        .onConflictDoUpdate({ target: tables.photoReactions.id, set: reaction })
        .run()
    }
  })

  const existingSettings = useDB().select().from(tables.settings).all()
  const settingsByKey = new Map(
    existingSettings.map((setting) => [
      `${setting.namespace}:${setting.key}`,
      setting,
    ]),
  )
  let restoredSettings = 0

  for (const setting of envelope.data.settings) {
    const existing = settingsByKey.get(`${setting.namespace}:${setting.key}`)
    if (
      !existing ||
      existing.isSecret ||
      existing.isReadonly ||
      existing.namespace === 'storage'
    ) {
      continue
    }
    useDB()
      .update(tables.settings)
      .set({ value: setting.value, updatedAt: new Date() })
      .where(eq(tables.settings.id, existing.id))
      .run()
    restoredSettings += 1
  }
  settingsManager.clearCache()

  return {
    success: true,
    mode,
    restored: { ...envelope.counts, settings: restoredSettings },
    snapshot: snapshot.file,
  }
}

export { ensureAdmin, readEnvelope }
