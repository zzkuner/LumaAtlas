import { describe, expect, it, vi } from 'vitest'
import type { StorageProvider } from '../../server/services/storage/interfaces'
import {
  collectPhotoAssetKeys,
  copyPhotoAsset,
  type PhotoAssetRow,
} from '../../server/services/storage/migration-assets'

const row = (overrides: Partial<PhotoAssetRow> = {}): PhotoAssetRow => ({
  id: 'photo-1',
  storageKey: null,
  thumbnailKey: null,
  originalUrl: null,
  thumbnailUrl: null,
  thumbnailVariants: null,
  livePhotoVideoKey: null,
  livePhotoVideoUrl: null,
  ...overrides,
})

const provider = (
  get: StorageProvider['get'],
  create = vi.fn(),
  getFileMeta = vi.fn().mockResolvedValue(null),
): StorageProvider =>
  ({ get, create, getFileMeta }) as unknown as StorageProvider

describe('storage migration assets', () => {
  it('collects original, thumbnail, variant, and live-photo keys only once', () => {
    expect(
      collectPhotoAssetKeys([
        row({
          storageKey: 'photos/a.jpg',
          thumbnailKey: 'thumb/a.webp',
          thumbnailVariants: [
            {
              key: 'thumb/a.webp',
              url: '/storage/thumb/a.webp',
              width: 100,
              height: 100,
              bytes: 100,
            },
          ],
          livePhotoVideoKey: 'photos/a.mov',
        }),
        row({ storageKey: 'photos/a.jpg' }),
      ]),
    ).toEqual(['photos/a.jpg', 'photos/a.mov', 'thumb/a.webp'])
  })

  it('copies and checks contents without removing the source', async () => {
    const source = provider(vi.fn().mockResolvedValue(Buffer.from('image')))
    const create = vi.fn().mockResolvedValue({ key: 'photos/a.jpg' })
    const target = provider(
      vi.fn().mockResolvedValue(Buffer.from('image')),
      create,
    )
    await expect(copyPhotoAsset('photos/a.jpg', source, target)).resolves.toBe(
      'copied',
    )
    expect(create).toHaveBeenCalledWith(
      'photos/a.jpg',
      Buffer.from('image'),
      'image/jpeg',
    )
    expect(source.delete).toBeUndefined()
  })

  it('reuses identical files and rejects conflicting target files', async () => {
    const source = provider(vi.fn().mockResolvedValue(Buffer.from('original')))
    const create = vi.fn()
    const matching = provider(
      vi.fn().mockResolvedValue(Buffer.from('original')),
      create,
      vi.fn().mockResolvedValue({ key: 'photos/a.jpg' }),
    )
    await expect(
      copyPhotoAsset('photos/a.jpg', source, matching),
    ).resolves.toBe('reused')
    expect(create).not.toHaveBeenCalled()

    const conflict = provider(
      vi.fn().mockResolvedValue(Buffer.from('different')),
      create,
      vi.fn().mockResolvedValue({ key: 'photos/a.jpg' }),
    )
    await expect(
      copyPhotoAsset('photos/a.jpg', source, conflict),
    ).rejects.toThrow('同名但内容不同')
    expect(create).not.toHaveBeenCalled()
  })

  it('fails when the source is missing or the written copy differs', async () => {
    const missing = provider(vi.fn().mockResolvedValue(null))
    await expect(
      copyPhotoAsset('photos/a.jpg', missing, provider(vi.fn())),
    ).rejects.toThrow('源文件不存在')

    const source = provider(vi.fn().mockResolvedValue(Buffer.from('source')))
    const target = provider(
      vi.fn().mockResolvedValue(Buffer.from('bad')),
      vi.fn().mockResolvedValue({ key: 'photos/a.jpg' }),
    )
    await expect(
      copyPhotoAsset('photos/a.jpg', source, target),
    ).rejects.toThrow('校验失败')
  })
})
