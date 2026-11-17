import type { R2StorageConfig } from '~~/shared/types/storage'
import type { StorageObject, StorageProvider } from '../interfaces'
import { isSupportedImageKey } from '../image-formats'
import { S3StorageProvider } from './s3'

export class R2StorageProvider implements StorageProvider {
  readonly config: R2StorageConfig
  private readonly s3: S3StorageProvider

  constructor(config: R2StorageConfig, logger?: Logger['storage']) {
    this.config = config
    this.s3 = new S3StorageProvider(
      {
        provider: 's3',
        endpoint: `https://${config.accountId}${!config.jurisdiction || config.jurisdiction === 'default' ? '' : `.${config.jurisdiction}`}.r2.cloudflarestorage.com`,
        region: 'auto',
        bucket: config.bucket,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        forcePathStyle: true,
        prefix: '',
      },
      logger,
    )
  }

  create(
    key: string,
    data: Buffer,
    contentType?: string,
  ): Promise<StorageObject> {
    return this.s3.create(key, data, contentType)
  }

  delete(key: string): Promise<void> {
    return this.s3.delete(key)
  }

  get(key: string): Promise<Buffer | null> {
    return this.s3.get(key)
  }

  getFileMeta(key: string): Promise<StorageObject | null> {
    return this.s3.getFileMeta(key)
  }

  listAll(): Promise<StorageObject[]> {
    return this.s3.listAll(`${this.config.prefix.replace(/\/+$/, '')}/`)
  }

  async listImages(): Promise<StorageObject[]> {
    return (await this.listAll()).filter((object) =>
      isSupportedImageKey(object.key),
    )
  }

  getPublicUrl(key: string): string {
    const path = key.split('/').map(encodeURIComponent).join('/')
    return this.config.cdnUrl
      ? `${this.config.cdnUrl.replace(/\/+$/, '')}/${path}`
      : `/image/${path}`
  }

  probe(): Promise<void> {
    return this.s3.probe()
  }
}
