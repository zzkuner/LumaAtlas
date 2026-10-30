export default eventHandler(async (event) => {
  const { storageProvider } = useStorageProvider(event)
  const requestedKey = getRouterParam(event, 'key')

  if (!requestedKey) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid key' })
  }

  const key = await assertPhotoAssetAccess(event, requestedKey)

  const photo = await storageProvider.get(key)
  if (!photo) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }
  logger.chrono.info('Serve image from key', key)
  return photo
})
