import { z } from 'zod'

export const s3StorageConfigSchema = z.object({
  provider: z.literal('s3'),
  bucket: z.string(),
  region: z.string().default('auto'),
  endpoint: z.string(),
  prefix: z.string().default('/photos').optional(),
  cdnUrl: z.string().optional(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  forcePathStyle: z.boolean().optional(),
  maxKeys: z.number().optional(),
})

export const r2StorageConfigSchema = z.object({
  provider: z.literal('r2'),
  accountId: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{32}$/i),
  jurisdiction: z.enum(['default', 'eu', 'us']).optional(),
  bucket: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  accessKeyId: z.string().trim().min(1),
  secretAccessKey: z.string().min(1),
  prefix: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/)
    .default('photos'),
  cdnUrl: z.union([z.url().startsWith('https://'), z.literal('')]).optional(),
})

export const localStorageConfigSchema = z.object({
  provider: z.literal('local'),
  basePath: z.string().min(1),
  baseUrl: z.string().optional(),
  prefix: z.string().optional(),
})

export const openListStorageConfigSchema = z.object({
  provider: z.literal('openlist'),
  baseUrl: z.string().min(1),
  rootPath: z.string().min(1),
  token: z.string().min(1),
  uploadEndpoint: z.string().default('/api/fs/put').optional(),
  downloadEndpoint: z.string().optional(),
  listEndpoint: z.string().optional(),
  deleteEndpoint: z.string().default('/api/fs/remove').optional(),
  metaEndpoint: z.string().default('/api/fs/get').optional(),
  pathField: z.string().default('path').optional(),
  cdnUrl: z.string().optional(),
})

export const storageConfigSchema = z.discriminatedUnion('provider', [
  s3StorageConfigSchema,
  r2StorageConfigSchema,
  localStorageConfigSchema,
  openListStorageConfigSchema,
])

export type StorageConfig = z.infer<typeof storageConfigSchema>

export type S3StorageConfig = z.infer<typeof s3StorageConfigSchema>
export type R2StorageConfig = z.infer<typeof r2StorageConfigSchema>
export type LocalStorageConfig = z.infer<typeof localStorageConfigSchema>
export type OpenListStorageConfig = z.infer<typeof openListStorageConfigSchema>
