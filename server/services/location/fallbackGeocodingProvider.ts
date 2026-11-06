import type { GeocodingProvider, LocationInfo } from './geocoding'

export class FallbackGeocodingProvider implements GeocodingProvider {
  constructor(private readonly providers: GeocodingProvider[]) {}

  async reverseGeocode(lat: number, lon: number): Promise<LocationInfo | null> {
    for (const provider of this.providers) {
      try {
        const location = await provider.reverseGeocode(lat, lon)
        if (location) return location
      } catch (error) {
        logger.location.warn(
          'Geocoding provider failed, trying fallback',
          error,
        )
      }
    }

    return null
  }
}
