const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.heic',
  '.heif',
  '.hif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
])

export const isSupportedImageKey = (key: string): boolean => {
  const normalized = key.toLowerCase()
  const extensionIndex = normalized.lastIndexOf('.')
  if (extensionIndex === -1) return false
  return SUPPORTED_IMAGE_EXTENSIONS.has(normalized.slice(extensionIndex))
}
