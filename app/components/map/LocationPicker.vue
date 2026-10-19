<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import type { MapInstance } from '~~/shared/types/map'

const props = withDefaults(
  defineProps<{
    modelValue?: { latitude: number; longitude: number } | null
    zoom?: number
    class?: string
  }>(),
  {
    modelValue: null,
    zoom: 4,
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [{ latitude: number; longitude: number } | null]
  pick: [{ latitude: number; longitude: number }]
}>()

const mapInstance = ref<MapInstance | null>(null)
const markerCoordinates = ref<[number, number] | null>(null)
const { locale } = useI18n()
const searchQuery = ref('')
const searchResults = ref<
  Array<{
    latitude: number
    longitude: number
    displayName: string
    type: string
  }>
>([])
const isSearching = ref(false)
const searchError = ref('')

let clickHandler: ((event: any) => void) | null = null

const syncFromProps = (
  value: { latitude: number; longitude: number } | null,
) => {
  if (value) {
    markerCoordinates.value = [value.longitude, value.latitude]
    if (mapInstance.value) {
      const map: any = mapInstance.value
      map.flyTo?.({
        center: markerCoordinates.value,
        zoom: Math.max(props.zoom ?? 4, 4),
        essential: true,
      })
    }
  } else {
    markerCoordinates.value = null
  }
}

watch(
  () => props.modelValue,
  (value) => {
    syncFromProps(value ?? null)
  },
  { immediate: true },
)

const updateValue = (
  latitude: number,
  longitude: number,
  shouldEmitPick = true,
) => {
  markerCoordinates.value = [longitude, latitude]
  emit('update:modelValue', { latitude, longitude })
  if (shouldEmitPick) {
    emit('pick', { latitude, longitude })
  }
}

const searchLocation = async () => {
  const query = searchQuery.value.trim()
  if (query.length < 2 || isSearching.value) return

  isSearching.value = true
  searchError.value = ''
  try {
    const response = await $fetch<{
      results: Array<{
        latitude: number
        longitude: number
        displayName: string
        type: string
      }>
    }>('/api/map/search', {
      query: {
        q: query,
        language: locale.value,
      },
    })
    searchResults.value = response.results
    if (response.results.length === 0) {
      searchError.value = '没有找到匹配的地点'
    }
  } catch {
    searchResults.value = []
    searchError.value = '地点搜索暂时不可用，请稍后重试'
  } finally {
    isSearching.value = false
  }
}

const selectSearchResult = (result: {
  latitude: number
  longitude: number
  displayName: string
}) => {
  searchQuery.value = result.displayName
  searchResults.value = []
  searchError.value = ''
  updateValue(result.latitude, result.longitude)
  const map: any = mapInstance.value
  map?.flyTo?.({
    center: [result.longitude, result.latitude],
    zoom: 14,
    essential: true,
  })
}

const handleMapClick = (event: any) => {
  const point =
    event?.lngLat ||
    event?.latlng ||
    (Array.isArray(event) ? { lng: event[0], lat: event[1] } : null)
  if (!point) {
    return
  }
  const latitude =
    typeof point.lat === 'number' ? point.lat : (point.latitude ?? point[1])
  const longitude =
    typeof point.lng === 'number' ? point.lng : (point.longitude ?? point[0])
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return
  }
  updateValue(latitude, longitude)
}

const onMapLoad = (map: MapInstance) => {
  mapInstance.value = map

  if (markerCoordinates.value) {
    const anyMap: any = map
    anyMap.setCenter?.(markerCoordinates.value)
    anyMap.setZoom?.(Math.max(props.zoom ?? 4, 4))
  }

  const anyMap: any = map
  if (typeof anyMap.on === 'function') {
    clickHandler = (event: any) => handleMapClick(event)
    anyMap.on('click', clickHandler)
  }
}

onBeforeUnmount(() => {
  if (mapInstance.value && clickHandler) {
    const anyMap: any = mapInstance.value
    if (typeof anyMap.off === 'function') {
      anyMap.off('click', clickHandler)
    }
  }
})
</script>

<template>
  <div class="w-full">
    <form
      class="mb-2 flex items-center gap-2"
      @submit.prevent="searchLocation"
    >
      <UInput
        v-model="searchQuery"
        class="min-w-0 flex-1"
        icon="lucide:search"
        placeholder="搜索城市、景点或地址"
        autocomplete="off"
      />
      <UButton
        type="submit"
        color="neutral"
        icon="lucide:search"
        label="搜索"
        :loading="isSearching"
        :disabled="searchQuery.trim().length < 2"
      />
    </form>

    <div
      v-if="searchResults.length"
      class="mb-2 overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
    >
      <button
        v-for="result in searchResults"
        :key="`${result.latitude}-${result.longitude}-${result.displayName}`"
        type="button"
        class="flex w-full items-start gap-2 border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900"
        @click="selectSearchResult(result)"
      >
        <Icon
          name="lucide:map-pin"
          class="mt-0.5 size-4 shrink-0 text-neutral-400"
        />
        <span class="min-w-0 leading-5 text-neutral-700 dark:text-neutral-200">
          {{ result.displayName }}
        </span>
      </button>
    </div>

    <p
      v-else-if="searchError"
      class="mb-2 text-xs text-red-600 dark:text-red-400"
    >
      {{ searchError }}
    </p>

    <div
      :class="['relative h-64 w-full overflow-hidden rounded-md', $props.class]"
    >
      <MapProvider
        class="h-full w-full"
        :map-id="'photo-location-picker'"
        :center="markerCoordinates ?? undefined"
        :zoom="
          markerCoordinates ? Math.max($props.zoom ?? 4, 4) : ($props.zoom ?? 2)
        "
        :interactive="true"
        :language="locale"
        @load="onMapLoad"
      >
        <MapProviderMarker
          v-if="markerCoordinates"
          :lnglat="markerCoordinates"
        >
          <template #marker>
            <div class="relative">
              <div
                class="absolute inset-0 animate-ping rounded-full bg-primary/40"
              />
              <div
                class="relative size-4 rounded-full border-2 border-white bg-primary shadow"
              />
            </div>
          </template>
        </MapProviderMarker>
      </MapProvider>

      <div
        v-if="!markerCoordinates"
        class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-600 dark:text-neutral-400"
      >
        <slot name="empty" />
      </div>
    </div>
  </div>
</template>
