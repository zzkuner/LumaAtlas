<script lang="ts" setup>
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
  <MapboxDefaultMarker
    v-if="lnglat && provider === 'mapbox'"
    :marker-id
    :lnglat
  >
    <template #marker>
      <slot name="marker" />
    </template>
  </MapboxDefaultMarker>
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
