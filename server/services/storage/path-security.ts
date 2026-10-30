import { promises as fs } from 'node:fs'
import path from 'node:path'

export class InvalidStoragePathError extends Error {
  constructor(message = 'Invalid storage path') {
    super(message)
    this.name = 'InvalidStoragePathError'
  }
}

const normalizePathPart = (value: string, allowEmpty: boolean): string => {
  if (value.includes('\0')) throw new InvalidStoragePathError()

  const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/')
  if (/^[a-zA-Z]:\//.test(normalized) || normalized.startsWith('//')) {
    throw new InvalidStoragePathError()
  }

  const segments = normalized
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new InvalidStoragePathError()
  }

  const result = segments.join('/')
  if (!allowEmpty && !result) throw new InvalidStoragePathError()
  return result
}

export const normalizeStorageKey = (key: string): string =>
  normalizePathPart(key, false)

export const combineStoragePrefixAndKey = (
  prefix: string | undefined,
  key: string,
): string => {
  const cleanKey = normalizeStorageKey(key)
  const cleanPrefix = normalizePathPart(prefix || '', true)

  if (!cleanPrefix || cleanKey === cleanPrefix) return cleanKey
  return cleanKey.startsWith(`${cleanPrefix}/`)
    ? cleanKey
    : `${cleanPrefix}/${cleanKey}`
}

const assertPathWithinRoot = (root: string, candidate: string): void => {
  const relative = path.relative(root, candidate)
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new InvalidStoragePathError()
  }
}

export const resolveStoragePath = (
  basePath: string,
  key: string,
  prefix?: string,
): { absFile: string; baseRoot: string; relKey: string } => {
  const baseRoot = path.resolve(basePath)
  const relKey = combineStoragePrefixAndKey(prefix, key)
  const absFile = path.resolve(baseRoot, relKey)
  assertPathWithinRoot(baseRoot, absFile)
  return { absFile, baseRoot, relKey }
}

export const resolveExistingStoragePath = async (
  basePath: string,
  key: string,
  prefix?: string,
): Promise<{ absFile: string; relKey: string }> => {
  const resolved = resolveStoragePath(basePath, key, prefix)
  const [realRoot, realFile] = await Promise.all([
    fs.realpath(resolved.baseRoot),
    fs.realpath(resolved.absFile),
  ])
  assertPathWithinRoot(realRoot, realFile)
  return { absFile: realFile, relKey: resolved.relKey }
}

const ensureStorageDirectory = async (
  basePath: string,
  relativeDirectory: string,
): Promise<string> => {
  const baseRoot = path.resolve(basePath)
  await fs.mkdir(baseRoot, { recursive: true })
  const realRoot = await fs.realpath(baseRoot)
  const normalizedDirectory = normalizePathPart(relativeDirectory, true)
  let currentDirectory = realRoot

  for (const segment of normalizedDirectory.split('/').filter(Boolean)) {
    const nextDirectory = path.join(currentDirectory, segment)
    try {
      const stat = await fs.lstat(nextDirectory)
      if (stat.isSymbolicLink()) {
        const realDirectory = await fs.realpath(nextDirectory)
        assertPathWithinRoot(realRoot, realDirectory)
        const realStat = await fs.stat(realDirectory)
        if (!realStat.isDirectory()) throw new InvalidStoragePathError()
        currentDirectory = realDirectory
      } else {
        if (!stat.isDirectory()) throw new InvalidStoragePathError()
        currentDirectory = nextDirectory
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await fs.mkdir(nextDirectory)
      currentDirectory = nextDirectory
    }
  }

  assertPathWithinRoot(realRoot, currentDirectory)
  return currentDirectory
}

export const prepareStorageDirectory = async (
  basePath: string,
  prefix?: string,
): Promise<{ absDirectory: string; relKey: string }> => {
  const relKey = normalizePathPart(prefix || '', true)
  const absDirectory = await ensureStorageDirectory(basePath, relKey)
  return { absDirectory, relKey }
}

export const prepareStorageWritePath = async (
  basePath: string,
  key: string,
  prefix?: string,
): Promise<{ absFile: string; relKey: string }> => {
  const relKey = combineStoragePrefixAndKey(prefix, key)
  const segments = relKey.split('/')
  const fileName = segments.pop()
  if (!fileName) throw new InvalidStoragePathError()

  const parentDirectory = await ensureStorageDirectory(
    basePath,
    segments.join('/'),
  )
  return { absFile: path.join(parentDirectory, fileName), relKey }
}
