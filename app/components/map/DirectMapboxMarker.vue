<script setup lang="ts">
import mapboxgl, { type Marker } from 'mapbox-gl'
import { mapboxMapKey } from '~/utils/mapboxContext'

const props = defineProps<{
  lnglat: [number, number]
}>()

const map = inject(mapboxMapKey)
const element = ref<HTMLElement | null>(null)
let marker: Marker | null = null

const syncMarker = () => {
  if (!map?.value || !element.value) return

  if (!marker) {
    marker = new mapboxgl.Marker({ element: element.value })
      .setLngLat(props.lnglat)
      .addTo(map.value)
    return
  }

  marker.setLngLat(props.lnglat)
}

watch([() => map?.value, () => props.lnglat], () => nextTick(syncMarker), {
  deep: true,
  immediate: true,
})

onBeforeUnmount(() => {
  marker?.remove()
  marker = null
})
</script>

<template>
  <div ref="element">
    <slot />
  </div>
</template>
