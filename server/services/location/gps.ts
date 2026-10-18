const parseRational = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized || /unknown|undefined|null/i.test(normalized)) {
      return undefined
    }
    const fraction = normalized.match(
      /^([-+]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/,
    )
    if (fraction) {
      const denominator = Number(fraction[2])
      return denominator ? Number(fraction[1]) / denominator : undefined
    }
    const numeric = Number(normalized)
    return Number.isFinite(numeric) ? numeric : undefined
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    const numerator = parseRational(object.numerator)
    const denominator = parseRational(object.denominator)
    if (numerator != null && denominator) return numerator / denominator
    return parseRational(object.value)
  }
  return undefined
}

const parseCoordinate = (value: unknown): number | undefined => {
  if (Array.isArray(value)) {
    const parts = value.map(parseRational)
    if (parts[0] == null) return undefined
    const sign = parts[0] < 0 ? -1 : 1
    return (
      sign *
      (Math.abs(parts[0]) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600)
    )
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    if ('degrees' in object || 'minutes' in object || 'seconds' in object) {
      return parseCoordinate([object.degrees, object.minutes, object.seconds])
    }
  }
  const direct = parseRational(value)
  if (direct != null) return direct
  if (typeof value !== 'string') return undefined

  const values = value
    .match(/[-+]?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/g)
    ?.map(parseRational)
    .filter((item): item is number => item != null)
  if (!values?.length) return undefined

  const sign = values[0]! < 0 ? -1 : 1
  return (
    sign *
    (Math.abs(values[0]!) + (values[1] || 0) / 60 + (values[2] || 0) / 3600)
  )
}

const applyCoordinateReference = (
  coordinate: number | undefined,
  reference: unknown,
) => {
  if (coordinate == null) return undefined
  const normalized = String(reference || '')
    .trim()
    .toUpperCase()
  return normalized.startsWith('S') || normalized.startsWith('W')
    ? -Math.abs(coordinate)
    : coordinate
}

const parseCoordinatePair = (value: unknown) => {
  if (Array.isArray(value) && value.length >= 2) {
    return {
      latitude: parseCoordinate(value[0]),
      longitude: parseCoordinate(value[1]),
    }
  }
  if (typeof value !== 'string') return {}

  const directional = value.match(/(.+?[NS])\s*[,;]?\s*(.+?[EW])(?:\s|$)/i)
  if (directional) {
    return {
      latitude: applyCoordinateReference(
        parseCoordinate(directional[1]),
        directional[1]?.match(/[NS]/i)?.[0],
      ),
      longitude: applyCoordinateReference(
        parseCoordinate(directional[2]),
        directional[2]?.match(/[EW]/i)?.[0],
      ),
    }
  }

  const decimal = value.match(
    /^\s*([-+]?\d+(?:\.\d+)?)\s*[,;\s]\s*([-+]?\d+(?:\.\d+)?)\s*$/,
  )
  return decimal
    ? { latitude: Number(decimal[1]), longitude: Number(decimal[2]) }
    : {}
}

/** Parse common decimal, DMS, rational and exiftool GPS representations. */
export function parseGPSCoordinates(exifData: unknown): {
  latitude?: number
  longitude?: number
} {
  if (!exifData || typeof exifData !== 'object') return {}
  const source = exifData as Record<string, unknown>
  const raw =
    source.RawExif && typeof source.RawExif === 'object'
      ? (source.RawExif as Record<string, unknown>)
      : {}
  const read = (key: string, alias?: string) =>
    source[key] ?? raw[key] ?? (alias ? raw[alias] : undefined)

  let latitude = applyCoordinateReference(
    parseCoordinate(read('GPSLatitude', 'GPS Latitude')),
    read('GPSLatitudeRef', 'GPS Latitude Ref'),
  )
  let longitude = applyCoordinateReference(
    parseCoordinate(read('GPSLongitude', 'GPS Longitude')),
    read('GPSLongitudeRef', 'GPS Longitude Ref'),
  )

  if (latitude == null || longitude == null) {
    const pair = parseCoordinatePair(
      read('GPSCoordinates', 'GPS Coordinates') ??
        read('GPSPosition', 'GPS Position'),
    )
    latitude ??= pair.latitude
    longitude ??= pair.longitude
  }

  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return {}
  }

  return { latitude, longitude }
}
