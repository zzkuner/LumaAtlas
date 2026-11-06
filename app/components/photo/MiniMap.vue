<script lang="ts" setup>
import { motion } from 'motion-v'
import { isMapboxMap, type MapInstance } from '~~/shared/types/map'

const props = defineProps<{
  photo: Photo
  latitude: number
  longitude: number
}>()

const MAPID = 'minimap-info-panel'

const config = useRuntimeConfig()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const isAnimating = ref(false)
const mapInstance = ref<MapInstance | null>(null)
let animationTimer: ReturnType<typeof setTimeout> | null = null
let loadTimer: ReturnType<typeof setTimeout> | null = null

const loaded = computed(() => status.value === 'ready')

const clearLoadTimer = () => {
  if (!loadTimer) return
  clearTimeout(loadTimer)
  loadTimer = null
}

const markMapUnavailable = () => {
  if (status.value !== 'loading') return
  clearLoadTimer()
  status.value = 'error'
}

const onMapLoad = (map: MapInstance) => {
  clearLoadTimer()
  mapInstance.value = map
  map.setCenter([props.longitude, props.latitude])
  setTimeout(() => {
    status.value = 'ready'
  }, 100)
}

const moveMapTo = (newLat: number, newLng: number) => {
  // 动画持续时间
  const DURATION = 1000
  if (mapInstance.value && loaded.value) {
    // 清除之前的计时器
    if (animationTimer) {
      clearTimeout(animationTimer)
      animationTimer = null
    }

    isAnimating.value = true
    mapInstance.value.flyTo({
      duration: DURATION,
      center: [newLng, newLat],
      zoom: 12,
      essential: true,
    })

    // 设置新的计时器，动画结束后显示指示点
    animationTimer = setTimeout(() => {
      isAnimating.value = false
      animationTimer = null
    }, DURATION)
  }
}

watch([() => props.latitude, () => props.longitude], ([newLat, newLng]) => {
  moveMapTo(newLat, newLng)
  const map = mapInstance.value
  // Only available with Mapbox
  if (map && isMapboxMap(map as any, config.public.map.provider)) {
    // 根据拍摄时间决定四种 lightPreset: dawn / day / dusk / night
    const photoDate = new Date(props.photo.dateTaken || 0)
    const hours = photoDate.getHours()
    if (hours >= 5 && hours < 7) {
      ;(map as any).setConfigProperty('basemap', 'lightPreset', 'dawn')
    } else if (hours >= 7 && hours < 17) {
      ;(map as any).setConfigProperty('basemap', 'lightPreset', 'day')
    } else if (hours >= 17 && hours < 21) {
      ;(map as any).setConfigProperty('basemap', 'lightPreset', 'dusk')
    } else {
      ;(map as any).setConfigProperty('basemap', 'lightPreset', 'night')
    }
  }
})

onMounted(() => {
  loadTimer = setTimeout(markMapUnavailable, 8000)
})

onUnmounted(() => {
  clearLoadTimer()
  if (animationTimer) {
    clearTimeout(animationTimer)
    animationTimer = null
  }
})
</script>

<template>
  <div
    class="relative h-44 w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
  >
    <MapProvider
      class="relative h-full w-full overflow-hidden"
      :map-id="MAPID"
      :center="[longitude, latitude]"
      :zoom="12"
      :interactive="false"
      :language="$i18n.locale"
      @load="onMapLoad"
      @error="markMapUnavailable"
    />
    <AnimatePresence>
      <motion.div
        v-if="loaded && !isAnimating"
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :exit="{ scale: 0.5, opacity: 0 }"
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div class="relative">
          <div
            class="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/70"
          />
          <div
            class="relative h-2 w-2 rounded-full bg-primary ring-2 ring-white/80"
          />
        </div>
      </motion.div>
    </AnimatePresence>
    <div
      v-if="status === 'loading'"
      class="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-neutral-950/85"
    >
      <Icon
        name="lucide:loader-circle"
        class="size-5 animate-spin text-neutral-400"
      />
    </div>
    <div
      v-else-if="status === 'error'"
      class="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 px-4 text-center dark:bg-neutral-900"
    >
      <Icon
        name="lucide:map-pin"
        class="size-5 text-neutral-400"
      />
      <p
        class="mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-300"
      >
        {{ $t('minimap.unavailable') }}
      </p>
      <p class="mt-1 font-mono text-[10px] text-neutral-400">
        {{ latitude.toFixed(5) }}, {{ longitude.toFixed(5) }}
      </p>
    </div>
  </div>
</template>
