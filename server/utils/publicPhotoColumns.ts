import { tables } from '~~/server/utils/db'
import type { Photo } from '~~/server/utils/db'

// Keep storage credentials, object keys, and import bookkeeping server-side.
export const publicPhotoColumns = {
  id: tables.photos.id,
  title: tables.photos.title,
  description: tables.photos.description,
  width: tables.photos.width,
  height: tables.photos.height,
  aspectRatio: tables.photos.aspectRatio,
  dateTaken: tables.photos.dateTaken,
  originalUrl: tables.photos.originalUrl,
  thumbnailUrl: tables.photos.thumbnailUrl,
  thumbnailVariants: tables.photos.thumbnailVariants,
  thumbnailHash: tables.photos.thumbnailHash,
  tags: tables.photos.tags,
  exif: tables.photos.exif,
  isVisible: tables.photos.isVisible,
  isFeatured: tables.photos.isFeatured,
  latitude: tables.photos.latitude,
  longitude: tables.photos.longitude,
  country: tables.photos.country,
  city: tables.photos.city,
  locationName: tables.photos.locationName,
  isLivePhoto: tables.photos.isLivePhoto,
  livePhotoVideoUrl: tables.photos.livePhotoVideoUrl,
}

export type PublicPhoto = Pick<Photo, keyof typeof publicPhotoColumns>
