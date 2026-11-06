import { describe, expect, it, vi } from 'vitest'
import { FallbackGeocodingProvider } from '../../server/services/location/fallbackGeocodingProvider'
import {
  type GeocodingProvider,
  type LocationInfo,
} from '../../server/services/location/geocoding'

function createProvider(result: LocationInfo | null): GeocodingProvider {
  return {
    reverseGeocode: vi.fn().mockResolvedValue(result),
  }
}

describe('FallbackGeocodingProvider', () => {
  it('uses the next provider when the preferred provider has no result', async () => {
    const preferred = createProvider(null)
    const fallback = createProvider({
      latitude: 22.5431,
      longitude: 114.0579,
      city: 'Shenzhen',
    })
    const provider = new FallbackGeocodingProvider([preferred, fallback])

    await expect(
      provider.reverseGeocode(22.5431, 114.0579),
    ).resolves.toMatchObject({ city: 'Shenzhen' })
    expect(preferred.reverseGeocode).toHaveBeenCalledOnce()
    expect(fallback.reverseGeocode).toHaveBeenCalledOnce()
  })

  it('stops after the first provider returns a location', async () => {
    const preferred = createProvider({
      latitude: 22.5431,
      longitude: 114.0579,
      city: '深圳市',
    })
    const fallback = createProvider(null)
    const provider = new FallbackGeocodingProvider([preferred, fallback])

    await expect(
      provider.reverseGeocode(22.5431, 114.0579),
    ).resolves.toMatchObject({ city: '深圳市' })
    expect(preferred.reverseGeocode).toHaveBeenCalledOnce()
    expect(fallback.reverseGeocode).not.toHaveBeenCalled()
  })
})
