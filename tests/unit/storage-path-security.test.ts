import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  InvalidStoragePathError,
  prepareStorageWritePath,
  resolveExistingStoragePath,
  resolveStoragePath,
} from '../../server/services/storage/path-security'

const temporaryDirectories: string[] = []

const makeTemporaryDirectory = async (prefix: string) => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('local storage path security', () => {
  it('rejects traversal and absolute keys', () => {
    const root = path.resolve('storage-root')
    for (const key of ['../secret', 'photos/../../secret', 'C:/secret']) {
      expect(() => resolveStoragePath(root, key)).toThrow(
        InvalidStoragePathError,
      )
    }
  })

  it('keeps normal keys inside the configured root', () => {
    const root = path.resolve('storage-root')
    const resolved = resolveStoragePath(root, 'image.jpg', 'photos')

    expect(resolved.relKey).toBe('photos/image.jpg')
    expect(path.relative(root, resolved.absFile)).toBe(
      path.join('photos', 'image.jpg'),
    )
  })

  it('resolves existing files without escaping through a symlink', async () => {
    const root = await makeTemporaryDirectory('lumaatlas-storage-')
    const outside = await makeTemporaryDirectory('lumaatlas-outside-')
    await mkdir(path.join(root, 'photos'))
    await writeFile(path.join(root, 'photos', 'inside.jpg'), 'inside')

    await expect(
      resolveExistingStoragePath(root, 'inside.jpg', 'photos'),
    ).resolves.toMatchObject({ relKey: 'photos/inside.jpg' })

    await writeFile(path.join(outside, 'secret.jpg'), 'secret')
    await symlink(outside, path.join(root, 'escape'), 'junction')

    await expect(
      resolveExistingStoragePath(root, 'escape/secret.jpg'),
    ).rejects.toBeInstanceOf(InvalidStoragePathError)
    await expect(
      prepareStorageWritePath(root, 'escape/new.jpg'),
    ).rejects.toBeInstanceOf(InvalidStoragePathError)
  })
})
