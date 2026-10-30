import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { StorageObject, StorageProvider } from '../interfaces'
import type { LocalStorageConfig } from '~~/shared/types/storage'
import { isSupportedImageKey } from '../image-formats'
import {
  combineStoragePrefixAndKey,
  prepareStorageDirectory,
  prepareStorageWritePath,
  resolveExistingStoragePath,
} from '../path-security'

export class LocalStorageProvider implements StorageProvider {
  config: LocalStorageConfig
  private logger?: Logger['storage']

  constructor(config: LocalStorageConfig, logger?: Logger['storage']) {
    this.config = config
    this.logger = logger
  }

  async create(key: string, fileBuffer: Buffer): Promise<StorageObject> {
    const { absFile, relKey } = await prepareStorageWritePath(
      this.config.basePath,
      key,
      this.config.prefix,
    )
    // 原子写入：写到临时文件再重命名
    const tempFile = `${absFile}.tmp-${randomUUID()}`
    try {
      await fs.writeFile(tempFile, fileBuffer, { flag: 'wx' })
      await fs.rename(tempFile, absFile)
    } catch (error) {
      await fs.rm(tempFile, { force: true }).catch(() => undefined)
      throw error
    }
    const stat = await fs.stat(absFile)
    this.logger?.success?.(`Saved file: ${absFile}`)
    return {
      key: relKey,
      size: stat.size,
      lastModified: stat.mtime,
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const { absFile } = await resolveExistingStoragePath(
        this.config.basePath,
        key,
        this.config.prefix,
      )
      await fs.unlink(absFile)
      this.logger?.success?.(`Deleted file: ${absFile}`)
    } catch (err) {
      // ignore if not exists
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const { absFile } = await resolveExistingStoragePath(
        this.config.basePath,
        key,
        this.config.prefix,
      )
      return await fs.readFile(absFile)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  }

  getPublicUrl(key: string): string {
    const relKey = combineStoragePrefixAndKey(this.config.prefix, key)
    const base = (this.config.baseUrl || '/storage').replace(/\/+$/, '')
    return `${base}/${relKey}`
  }

  async listAll(): Promise<StorageObject[]> {
    const results: StorageObject[] = []
    const { absDirectory: baseDir, relKey: prefix } =
      await prepareStorageDirectory(this.config.basePath, this.config.prefix)

    const walk = async (dir: string, relBase: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const abs = path.join(dir, entry.name)
        const rel = path.posix.join(relBase.replace(/\\/g, '/'), entry.name)
        if (entry.isDirectory()) {
          await walk(abs, rel)
        } else if (entry.isFile()) {
          const stat = await fs.stat(abs)
          results.push({ key: rel, size: stat.size, lastModified: stat.mtime })
        }
      }
    }

    await walk(baseDir, prefix)
    return results
  }

  async listImages(): Promise<StorageObject[]> {
    const all = await this.listAll()
    return all.filter((object) => isSupportedImageKey(object.key))
  }

  async getFileMeta(key: string): Promise<StorageObject | null> {
    // First try with combined prefix
    try {
      const { absFile, relKey } = await resolveExistingStoragePath(
        this.config.basePath,
        key,
        this.config.prefix,
      )
      const stat = await fs.stat(absFile)
      if (!stat.isFile()) return null
      return { key: relKey, size: stat.size, lastModified: stat.mtime }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }

    // Fallback: try without adding prefix (in case key already contains it or was stored raw)
    try {
      const { absFile: rawAbs, relKey: rawRel } =
        await resolveExistingStoragePath(this.config.basePath, key)
      const stat = await fs.stat(rawAbs)
      if (!stat.isFile()) return null
      return { key: rawRel, size: stat.size, lastModified: stat.mtime }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw err
    }
  }
}
