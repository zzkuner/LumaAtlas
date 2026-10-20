export const resolvePhotoCollection = <T extends { id: string }>(
  photos: T[],
  sourcePhotoIds?: readonly string[] | null,
) => {
  if (!sourcePhotoIds) return photos

  const photosById = new Map(photos.map((photo) => [photo.id, photo]))
  return sourcePhotoIds
    .map((photoId) => photosById.get(photoId))
    .filter((photo): photo is T => Boolean(photo))
}
