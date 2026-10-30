const HEIC_EXTENSIONS = ['.heic', '.heif', '.hif']

export default eventHandler(async (event) => {
  await requireAdminSession(event)
  const { storageProvider } = useStorageProvider(event)
  const photoId = getRouterParam(event, 'photoId')

  if (!photoId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Photo ID is required',
    })
  }

  const photo = await useDB()
    .select()
    .from(tables.photos)
    .where(eq(tables.photos.id, photoId))
    .get()

  if (!photo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Photo not found',
    })
  }

  logger.image.info(`Deleting photo ${photo.title || photo.id || photoId}`)

  if (photo.storageKey) {
    logger.image.info(`Deleting photo files for ${photoId} from storage`)
    try {
      const lowerStorageKey = photo.storageKey.toLowerCase()
      const heicExtension = HEIC_EXTENSIONS.find((ext) =>
        lowerStorageKey.endsWith(ext),
      )
      if (heicExtension) {
        const jpegKey =
          photo.storageKey.slice(
            0,
            photo.storageKey.length - heicExtension.length,
          ) + '.jpeg'

        if (jpegKey !== photo.storageKey) {
          logger.image.info(
            `Deleting converted JPEG for HEIC photo ${photoId}: ${jpegKey}`,
          )
          await storageProvider.delete(jpegKey)
        }
      }
      const thumbnailKeys = new Set([
        ...(photo.thumbnailKey ? [photo.thumbnailKey] : []),
        ...(photo.thumbnailVariants?.map((variant) => variant.key) ?? []),
      ])
      for (const thumbnailKey of thumbnailKeys) {
        await storageProvider.delete(thumbnailKey)
      }
      if (photo.livePhotoVideoKey) {
        await storageProvider.delete(photo.livePhotoVideoKey)
      }
      // Delete the source last. If a derived asset fails, the database still
      // points to a usable original and the operation can be retried safely.
      await storageProvider.delete(photo.storageKey)
    } catch (error) {
      logger.image.error(`Failed to delete files for photo ${photoId}`, error)
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to delete photo files from storage',
      })
    }
  }

  try {
    useDB().delete(tables.photos).where(eq(tables.photos.id, photoId)).run()
  } catch (error) {
    logger.image.error(
      `Failed to delete database row for photo ${photoId}`,
      error,
    )
    throw createError({
      statusCode: 500,
      statusMessage: 'Photo files were deleted but the database update failed',
    })
  }

  logger.image.success(`Photo ${photoId} deleted`)

  return {
    statusCode: 200,
    statusMessage: 'Photo deleted successfully',
  }
})
