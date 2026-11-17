import { afterEach, describe, expect, it, vi } from 'vitest'
import { S3Client } from '@aws-sdk/client-s3'
import { r2StorageConfigSchema } from '../../shared/types/storage'
import { R2StorageProvider } from '../../server/services/storage/providers/r2'
import { S3StorageProvider } from '../../server/services/storage/providers/s3'

const config = r2StorageConfigSchema.parse({
  provider: 'r2',
  accountId: '0123456789abcdef0123456789abcdef',
  bucket: 'photo-bucket',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
})

afterEach(() => vi.restoreAllMocks())

describe('Cloudflare R2 storage', () => {
  it('validates an account and bucket before making network requests', () => {
    expect(config.prefix).toBe('photos')
    expect(config.jurisdiction).toBeUndefined()
    expect(
      r2StorageConfigSchema.safeParse({ ...config, accountId: 'bad' }).success,
    ).toBe(false)
    expect(
      r2StorageConfigSchema.safeParse({ ...config, bucket: '../bad' }).success,
    ).toBe(false)
    expect(
      r2StorageConfigSchema.safeParse({
        ...config,
        cdnUrl: 'http://example.com',
      }).success,
    ).toBe(false)
  })

  it('uses the private image proxy unless a public domain is configured', () => {
    const provider = new R2StorageProvider(config)
    expect(provider.getPublicUrl('photos/my image.jpg')).toBe(
      '/image/photos/my%20image.jpg',
    )
    expect('getSignedUrl' in provider).toBe(false)

    const withDomain = new R2StorageProvider({
      ...config,
      cdnUrl: 'https://img.example.com/',
    })
    expect(withDomain.getPublicUrl('photos/a.jpg')).toBe(
      'https://img.example.com/photos/a.jpg',
    )
  })

  it('maps R2 to path-style S3 without duplicating the photo prefix', async () => {
    const create = vi
      .spyOn(S3StorageProvider.prototype, 'create')
      .mockImplementation(function (this: S3StorageProvider, key, data) {
        expect(this.config.endpoint).toBe(
          'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
        )
        expect(this.config.region).toBe('auto')
        expect(this.config.forcePathStyle).toBe(true)
        expect(this.config.prefix).toBe('')
        return Promise.resolve({ key, size: data.length })
      })
    const listAll = vi
      .spyOn(S3StorageProvider.prototype, 'listAll')
      .mockResolvedValue([])
    const provider = new R2StorageProvider(config)

    await expect(
      provider.create('photos/a.jpg', Buffer.from('image')),
    ).resolves.toMatchObject({ key: 'photos/a.jpg' })
    await provider.listAll()
    expect(create).toHaveBeenCalledOnce()
    expect(listAll).toHaveBeenCalledWith('photos/')
    const eu = new R2StorageProvider({ ...config, jurisdiction: 'eu' })
    expect((eu as any).s3.config.endpoint).toBe(
      'https://0123456789abcdef0123456789abcdef.eu.r2.cloudflarestorage.com',
    )
  })

  it('distinguishes a missing object from a storage failure', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send')
    const provider = new R2StorageProvider(config)

    send.mockRejectedValueOnce({
      name: 'NoSuchKey',
      $metadata: { httpStatusCode: 404 },
    })
    await expect(provider.get('photos/missing.jpg')).resolves.toBeNull()

    send.mockRejectedValueOnce({
      name: 'AccessDenied',
      $metadata: { httpStatusCode: 403 },
    })
    await expect(provider.get('photos/private.jpg')).rejects.toMatchObject({
      name: 'AccessDenied',
    })
  })
})
