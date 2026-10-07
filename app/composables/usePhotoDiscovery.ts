export type DiscoveryMode =
  | 'featured'
  | 'recent'
  | 'random'
  | 'nearby'
  | 'faraway'

export interface DiscoveryLocation {
  latitude: number
  longitude: number
}

const toRadians = (value: number) => (value * Math.PI) / 180

export const getPhotoDistance = (photo: Photo, location: DiscoveryLocation) => {
  if (photo.latitude == null || photo.longitude == null) return null

  const earthRadiusKm = 6371
  const latitudeDelta = toRadians(photo.latitude - location.latitude)
  const longitudeDelta = toRadians(photo.longitude - location.longitude)
  const originLatitude = toRadians(location.latitude)
  const photoLatitude = toRadians(photo.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(photoLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

const normalize = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()

const matchesText = (photo: Photo, query: string) => {
  if (!query) return true

  return [
    photo.title,
    photo.description,
    photo.tags?.join(' '),
    photo.city,
    photo.country,
    photo.locationName,
    photo.exif?.Make,
    photo.exif?.Model,
    photo.exif?.LensMake,
    photo.exif?.LensModel,
  ]
    .map(normalize)
    .some((value) => value.includes(query))
}

const stableRandomScore = (photoId: string, seed: number) => {
  let hash = seed || 1
  for (let index = 0; index < photoId.length; index += 1) {
    hash = Math.imul(hash ^ photoId.charCodeAt(index), 2654435761)
  }
  return (hash >>> 0) / 4294967295
}

export const discoverPhotos = (
  photos: Photo[],
  options: {
    mode: DiscoveryMode
    query?: string
    tag?: string
    city?: string
    location?: DiscoveryLocation | null
    radiusKm?: number
    randomSeed?: number
  },
) => {
  const query = normalize(options.query)
  const tag = normalize(options.tag)
  const city = normalize(options.city)

  const filtered = photos.filter((photo) => {
    if (!matchesText(photo, query)) return false
    if (tag && !photo.tags?.some((value) => normalize(value) === tag)) {
      return false
    }
    if (city && normalize(photo.city) !== city) return false
    return true
  })

  if (options.mode === 'featured') {
    return filtered.filter((photo) => photo.isFeatured)
  }

  if (options.mode === 'random') {
    return filtered.toSorted(
      (left, right) =>
        stableRandomScore(left.id, options.randomSeed || 1) -
        stableRandomScore(right.id, options.randomSeed || 1),
    )
  }

  if (options.mode === 'nearby' || options.mode === 'faraway') {
    if (!options.location) return []

    const withDistance = filtered
      .map((photo) => ({
        photo,
        distance: getPhotoDistance(photo, options.location!),
      }))
      .filter(
        (item): item is { photo: Photo; distance: number } =>
          item.distance != null,
      )

    if (options.mode === 'nearby') {
      const radiusKm = Math.max(1, options.radiusKm || 100)
      return withDistance
        .filter((item) => item.distance <= radiusKm)
        .toSorted((left, right) => left.distance - right.distance)
        .map((item) => item.photo)
    }

    return withDistance
      .toSorted((left, right) => right.distance - left.distance)
      .map((item) => item.photo)
  }

  return filtered.toSorted((left, right) => {
    const leftDate = left.dateTaken ? new Date(left.dateTaken).getTime() : 0
    const rightDate = right.dateTaken ? new Date(right.dateTaken).getTime() : 0
    return rightDate - leftDate
  })
}
