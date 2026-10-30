import type { InjectionKey, ShallowRef } from 'vue'
import type { Map as MapboxMap } from 'mapbox-gl'

export const mapboxMapKey: InjectionKey<ShallowRef<MapboxMap | null>> = Symbol(
  'lumaatlas-mapbox-map',
)
