import { describe, expect, it } from 'vitest'
import { clusterMarkers } from '../../app/utils/clustering'
import type { PhotoMarker } from '../../shared/types/map'

const marker = (
  id: string,
  longitude: number,
  thumbnailUrl?: string,
): PhotoMarker => ({
  id,
  latitude: 30,
  longitude,
  thumbnailUrl,
})

describe('map photo clustering', () => {
  it('reveals more individual photos as the map zooms in', () => {
    const markers = [marker('a', 120), marker('b', 120.01)]

    expect(clusterMarkers(markers, 8)).toHaveLength(1)
    expect(clusterMarkers(markers, 10)).toHaveLength(2)
  })

  it('stops clustering at detailed zoom levels', () => {
    const markers = [marker('a', 120), marker('b', 120.00001)]

    const points = clusterMarkers(markers, 14)
    expect(points).toHaveLength(2)
    expect(points.every((point) => point.properties.cluster !== true)).toBe(
      true,
    )
  })

  it('uses a real thumbnail as the cluster cover when available', () => {
    const points = clusterMarkers(
      [marker('a', 120), marker('b', 120.001, '/photo-b.jpg')],
      8,
    )

    expect(points[0]?.properties.marker?.id).toBe('b')
  })
})
