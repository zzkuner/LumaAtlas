<script setup lang="ts">
import mapboxgl, {
  type AttributionControlOptions,
  type Map as MapboxMap,
  type MapOptions,
} from 'mapbox-gl'
import { mapboxMapKey } from '~/utils/mapboxContext'

const props = withDefaults(
  defineProps<{
    accessToken: string
    mapStyle: MapOptions['style']
    center?: [number, number]
    zoom?: number
    interactive?: boolean
    attributionControl?: false | AttributionControlOptions
    language?: string
    config?: MapOptions['config']
  }>(),
  {
    center: () => [0, 0],
    zoom: 2,
    interactive: true,
    attributionControl: () => ({ compact: true }),
    language: undefined,
    config: undefined,
  },
)

const emit = defineEmits<{
  load: [map: MapboxMap]
  zoom: []
}>()

const container = ref<HTMLElement | null>(null)
const map = shallowRef<MapboxMap | null>(null)
provide(mapboxMapKey, map)

const handleZoom = () => emit('zoom')

onMounted(() => {
  if (!container.value) return

  mapboxgl.accessToken = props.accessToken
  const instance = new mapboxgl.Map({
    container: container.value,
    style: props.mapStyle,
    center: props.center,
    zoom: props.zoom,
    interactive: props.interactive,
    attributionControl: false,
    language: props.language,
    config: props.config,
  })

  if (props.attributionControl !== false) {
    instance.addControl(
      new mapboxgl.AttributionControl(props.attributionControl),
    )
  }

  map.value = instance
  instance.once('load', () => emit('load', instance))
  instance.on('zoom', handleZoom)
})

watch(
  () => props.mapStyle,
  (style) => {
    if (map.value && style) map.value.setStyle(style)
  },
)

watch(
  () => props.center,
  (center) => {
    if (map.value && center) map.value.setCenter(center)
  },
)

onBeforeUnmount(() => {
  if (!map.value) return
  map.value.off('zoom', handleZoom)
  map.value.remove()
  map.value = null
})
</script>

<template>
  <div
    ref="container"
    class="relative h-full w-full"
  >
    <slot />
  </div>
</template>
