import { withRetry, RetryPresets } from '../../utils/retry'
import { settingsManager } from '../settings/settingsManager'
import { FallbackGeocodingProvider } from './fallbackGeocodingProvider'

export interface LocationInfo {
  latitude: number
  longitude: number
  country?: string
  city?: string
  locationName?: string
}

export interface GeocodingProvider {
  reverseGeocode(lat: number, lon: number): Promise<LocationInfo | null>
}

/**
 * Mapbox 地理编码提供者
 * 高精度商业地理编码服务，支持全球范围和多语言
 */
export class MapboxGeocodingProvider implements GeocodingProvider {
  private accessToken: string
  private readonly baseUrl = 'https://api.mapbox.com'
  private lastRequestTime = 0
  private rateLimitQueue: Promise<void> = Promise.resolve()
  private readonly rateLimitMs = 100 // Mapbox 默认速率限制为 1000/分钟，约60ms间隔

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async reverseGeocode(lat: number, lon: number): Promise<LocationInfo | null> {
    try {
      return await withRetry(
        async () => {
          // 应用速率限制
          await this.applyRateLimit()

          // 获取设置的地理编码语言，默认 'en'
          const language =
            (await settingsManager.get<string>('location', 'language')) || 'en'

          const url = new URL('/search/geocode/v6/reverse', this.baseUrl)
          url.searchParams.set('access_token', this.accessToken)
          url.searchParams.set('longitude', lon.toString())
          url.searchParams.set('latitude', lat.toString())
          url.searchParams.set('types', 'address,place,district,region,country')

          // 映射 Mapbox 首选语言格式
          let mapboxLang = language
          if (language === 'zh-CN') {
            mapboxLang = 'zh-Hans'
          } else if (language === 'zh-TW') {
            mapboxLang = 'zh-Hant'
          }
          url.searchParams.set('language', mapboxLang)

          logger.location.info(
            `Mapbox reverse geocoding request: ${url.origin}${url.pathname}`,
          )

          const response = await fetch(url.toString())

          if (!response.ok) {
            throw new Error(
              `Mapbox API error: ${response.status} ${response.statusText}`,
            )
          }

          const data = await response.json()

          if (!data || !data.features || data.features.length === 0) {
            logger.location.warn('Mapbox API returned no features')
            return null
          }

          // 取第一个最相关的结果
          const feature = data.features[0]
          const properties = feature.properties || {}
          const context = properties.context || {}

          // 提取国家信息
          const country = context.country?.name

          // 提取城市信息（优先级：locality > place > locality > district > region）
          const city =
            context.locality?.name ||
            context.place?.name ||
            context.locality?.name ||
            context.district?.name ||
            context.region?.name

          // 构建位置名称
          const locationName = properties.place_formatted || properties.name

          logger.location.success(
            `Successfully geocoded location: ${city}, ${country}`,
          )
          return {
            latitude: lat,
            longitude: lon,
            country,
            city,
            locationName,
          }
        },
        {
          ...RetryPresets.network,
          timeout: 10000,
          delayStrategy: 'exponential',
        },
        logger.location,
      )
    } catch (error) {
      logger.location.error(
        'Mapbox reverse geocoding failed after all retries:',
        error,
      )
      return null
    }
  }

  private async applyRateLimit(): Promise<void> {
    const scheduled = this.rateLimitQueue.then(async () => {
      const elapsed = Date.now() - this.lastRequestTime
      if (elapsed < this.rateLimitMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.rateLimitMs - elapsed),
        )
      }
      this.lastRequestTime = Date.now()
    })
    this.rateLimitQueue = scheduled.catch(() => undefined)
    await scheduled
  }
}

/**
 * OpenStreetMap Nominatim API 地理编码提供者
 * 免费的地理编码服务，适合开发和小规模使用
 */
export class NominatimGeocodingProvider implements GeocodingProvider {
  private readonly baseUrl: string
  private readonly userAgent =
    'LumaAtlas/1.0 (+https://github.com/zzkuner/LumaAtlas)'
  private lastRequestTime = 0
  private rateLimitQueue: Promise<void> = Promise.resolve()
  private readonly rateLimitMs = 1000 // Nominatim 要求至少1秒间隔

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://nominatim.openstreetmap.org'
  }

  async reverseGeocode(lat: number, lon: number): Promise<LocationInfo | null> {
    try {
      return await withRetry(
        async () => {
          // 应用速率限制
          await this.applyRateLimit()

          // 获取设置的地理编码语言，默认 'en'
          const language =
            (await settingsManager.get<string>('location', 'language')) || 'en'

          const url = new URL('/reverse', this.baseUrl)
          url.searchParams.set('lat', lat.toString())
          url.searchParams.set('lon', lon.toString())
          url.searchParams.set('format', 'json')
          url.searchParams.set('addressdetails', '1')
          url.searchParams.set('accept-language', `${language},en`)

          const response = await fetch(url.toString(), {
            headers: {
              'User-Agent': this.userAgent,
            },
          })

          if (!response.ok) {
            throw new Error(
              `Nominatim API error: ${response.status} ${response.statusText}`,
            )
          }

          const data = await response.json()

          if (!data || data.error) {
            throw new Error(`Nominatim API returned error: ${data?.error}`)
          }

          const address = data.address || {}

          // 提取国家信息
          const country = address.country || address.country_code?.toUpperCase()

          // 提取城市信息（优先级：district > city > town > county > state > village > hamlet）
          // 适配中国行政区划
          const city =
            address.district ||
            address.city ||
            address.town ||
            address.county ||
            address.state ||
            address.village ||
            address.hamlet

          // 构建位置名称
          const locationName = data.display_name

          return {
            latitude: lat,
            longitude: lon,
            country,
            city,
            locationName,
          }
        },
        {
          ...RetryPresets.network,
          timeout: 15000, // Nominatim 可能比较慢
          delayStrategy: 'linear', // 线性退避，避免过快重试
        },
        logger.location,
      )
    } catch (error) {
      logger.location.error(
        'Nominatim reverse geocoding failed after all retries:',
        error,
      )
      return null
    }
  }

  private async applyRateLimit(): Promise<void> {
    const scheduled = this.rateLimitQueue.then(async () => {
      const elapsed = Date.now() - this.lastRequestTime
      if (elapsed < this.rateLimitMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.rateLimitMs - elapsed),
        )
      }
      this.lastRequestTime = Date.now()
    })
    this.rateLimitQueue = scheduled.catch(() => undefined)
    await scheduled
  }
}

/**
 * 创建地理编码提供者实例
 * @description 优先使用 Mapbox，如果没有配置则回退到 Nominatim
 */
let cachedProvider:
  | { cacheKey: string; provider: GeocodingProvider }
  | undefined

async function createGeocodingProvider(): Promise<GeocodingProvider> {
  const legacyMapboxToken = await settingsManager.get<string>(
    'location',
    'mapbox.token',
  )
  const configuredMapboxToken = await settingsManager.get<string>(
    'map',
    'mapbox.token',
  )
  const mapboxToken = legacyMapboxToken || configuredMapboxToken

  const baseUrl =
    (await settingsManager.get<string>('location', 'nominatim.baseUrl')) ||
    'https://nominatim.openstreetmap.org'

  if (mapboxToken) {
    const cacheKey = `mapbox:${mapboxToken}:nominatim:${baseUrl}`
    if (cachedProvider?.cacheKey !== cacheKey) {
      cachedProvider = {
        cacheKey,
        provider: new FallbackGeocodingProvider([
          new MapboxGeocodingProvider(mapboxToken),
          new NominatimGeocodingProvider(baseUrl),
        ]),
      }
    }
    return cachedProvider.provider
  }

  const cacheKey = `nominatim:${baseUrl}`
  if (cachedProvider?.cacheKey !== cacheKey) {
    cachedProvider = {
      cacheKey,
      provider: new NominatimGeocodingProvider(baseUrl),
    }
  }
  return cachedProvider.provider
}

export async function extractLocationFromGPS(
  gpsLatitude?: number,
  gpsLongitude?: number,
  provider?: GeocodingProvider,
): Promise<LocationInfo | null> {
  if (gpsLatitude == null || gpsLongitude == null) {
    return null
  }

  // 验证坐标范围
  if (Math.abs(gpsLatitude) > 90 || Math.abs(gpsLongitude) > 180) {
    logger.location.warn(
      `Invalid GPS coordinates: ${gpsLatitude}, ${gpsLongitude}`,
    )
    return null
  }

  logger.location.info(
    `Reverse geocoding coordinates: ${gpsLatitude}, ${gpsLongitude}`,
  )

  // 如果没有指定提供者，使用默认提供者
  const geocodingProvider = provider || (await createGeocodingProvider())

  try {
    const locationInfo = await geocodingProvider.reverseGeocode(
      gpsLatitude,
      gpsLongitude,
    )

    if (locationInfo) {
      logger.location.success(
        `Location found: ${locationInfo.city}, ${locationInfo.country}`,
      )
    } else {
      logger.location.warn('No location found for coordinates')
    }

    return locationInfo
  } catch (error) {
    logger.location.error('Location extraction failed:', error)
    return null
  }
}

export { parseGPSCoordinates } from './gps'
