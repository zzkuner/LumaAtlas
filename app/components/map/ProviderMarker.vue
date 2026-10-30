<script lang="ts" setup>
import { MglMarker } from '@indoorequal/vue-maplibre-gl'

withDefaults(
  defineProps<{
    markerId?: string
    lnglat?: [number, number]
  }>(),
  {
    markerId: undefined,
    lnglat: undefined,
  },
)

const mapConfig = computed(() => {
  const config = getSetting('map')
  return typeof config === 'object' && config ? config : {}
})

const provider = computed(() => mapConfig.value.provider || 'maplibre')
</script>

<template>
  <MapDirectMapboxMarker
    v-if="lnglat && provider === 'mapbox'"
    :lnglat
  >
    <slot name="marker" />
  </MapDirectMapboxMarker>
  <MglMarker
    v-else-if="lnglat"
    :coordinates="lnglat"
  >
    <template #marker>
      <slot name="marker" />
    </template>
  </MglMarker>
</template>

<style scoped></style>
