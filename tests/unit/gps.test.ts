import { describe, expect, it } from 'vitest'
import { parseGPSCoordinates } from '../../server/services/location/gps'

describe('EXIF GPS parsing', () => {
  it('parses decimal coordinates including zero', () => {
    expect(
      parseGPSCoordinates({ GPSLatitude: 0, GPSLongitude: 113.9345 }),
    ).toEqual({ latitude: 0, longitude: 113.9345 })
  })

  it('parses DMS arrays and applies south/west references', () => {
    expect(
      parseGPSCoordinates({
        GPSLatitude: [22, 32, 30],
        GPSLatitudeRef: 'S',
        GPSLongitude: [113, 56, 4.2],
        GPSLongitudeRef: 'W',
      }),
    ).toEqual({
      latitude: -22.541666666666668,
      longitude: -113.9345,
    })
  })

  it('parses directional exiftool position strings', () => {
    expect(
      parseGPSCoordinates({
        GPSPosition: `22 deg 32' 30.00" N, 113 deg 56' 4.20" E`,
      }),
    ).toEqual({
      latitude: 22.541666666666668,
      longitude: 113.9345,
    })
  })

  it('falls back to RawExif and rejects blank or invalid coordinates', () => {
    expect(
      parseGPSCoordinates({
        GPSLatitude: '',
        GPSLongitude: '',
        RawExif: {
          GPSCoordinates: '22.5416667, 113.9345',
        },
      }),
    ).toEqual({ latitude: 22.5416667, longitude: 113.9345 })
    expect(
      parseGPSCoordinates({ GPSLatitude: 'Unknown ()', GPSLongitude: '' }),
    ).toEqual({})
  })

  it('falls back to separate RawExif coordinates when normalized tags are blank', () => {
    expect(
      parseGPSCoordinates({
        GPSLatitude: '',
        GPSLatitudeRef: 'Unknown ()',
        GPSLongitude: '',
        GPSLongitudeRef: 'Unknown ()',
        RawExif: {
          GPSLatitude: `22 deg 32' 30.00"`,
          GPSLatitudeRef: 'N',
          GPSLongitude: `113 deg 56' 4.20"`,
          GPSLongitudeRef: 'E',
        },
      }),
    ).toEqual({
      latitude: 22.541666666666668,
      longitude: 113.9345,
    })
  })
})
