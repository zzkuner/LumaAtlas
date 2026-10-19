<script setup lang="ts">
import { motion } from 'motion-v'
import type {
  DiscoveryLocation,
  DiscoveryMode,
} from '~/composables/usePhotoDiscovery'

type HomeViewMode = 'all' | DiscoveryMode
type GalleryLayout = 'big' | 'masonry' | 'grid'
type GalleryColumns = number | 'auto'

const GALLERY_PREFERENCES_KEY = 'lumaatlas:gallery-preferences'

interface Props {
  photos: Photo[]
  columns?: number | 'auto'
  mode?: 'home' | 'collection'
  showHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  columns: 'auto',
  mode: 'home',
  showHeader: true,
})

const dayjs = useDayjs()
const router = useRouter()
const route = useRoute()

const { status: photosStatus } = usePhotos()
const { filteredPhotos, hasActiveFilters, clearAllFilters } = usePhotoFilters()
const { sortedPhotos } = usePhotoSort()
const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteLogo = computed(() => String(getSetting('app:logoUrl') || ''))

const allowedViewModes: HomeViewMode[] = [
  'all',
  'featured',
  'recent',
  'random',
  'nearby',
  'faraway',
]
const configuredSource = computed<HomeViewMode>(() => {
  const value = String(getSetting('app:appearance.home.source') || 'all')
  return allowedViewModes.includes(value as HomeViewMode)
    ? (value as HomeViewMode)
    : 'all'
})
const viewMode = computed<HomeViewMode>(() => {
  const value = String(route.query.view || '')
  return allowedViewModes.includes(value as HomeViewMode)
    ? (value as HomeViewMode)
    : configuredSource.value
})
const visitorLocation = ref<DiscoveryLocation | null>(null)
const locationStatus = ref<'idle' | 'loading' | 'ready' | 'denied'>('idle')
const randomSeed = computed(() => Number(route.query.seed || 1) || 1)

const displayPhotos = computed(() => {
  if (props.mode === 'collection') {
    return props.photos
  }

  const photos = hasActiveFilters.value
    ? filteredPhotos.value
    : sortedPhotos.value

  if (viewMode.value === 'all') return photos
  return discoverPhotos(photos, {
    mode: viewMode.value,
    location: visitorLocation.value,
    radiusKm: 100,
    randomSeed: randomSeed.value,
  })
})

const { currentPhotoIndex, isViewerOpen } = storeToRefs(useViewerState())

const FIRST_SCREEN_ITEMS_COUNT = 50
const hasAnimated = ref(false)
const showFloatingActions = ref(false)
const dateRange = ref<string>()
const visiblePhotos = ref(new Set<number>())

const isMobile = useMediaQuery('(max-width: 768px)')
const { batchProcessLivePhotos } = useLivePhotoProcessor()

const processedBatch = ref(new Set<string>())
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const homeModules = computed(() => {
  const config = asRecord(getSetting('app:appearance.home.modules'))
  const allowed = ['header', 'gallery', 'footer']
  const requested = Array.isArray(config.order) ? config.order : []
  const order = [...new Set([...requested, ...allowed])].filter(
    (item): item is string =>
      typeof item === 'string' && allowed.includes(item),
  )
  const hidden = Array.isArray(config.hidden)
    ? config.hidden.filter(
        (item): item is string =>
          typeof item === 'string' && allowed.includes(item),
      )
    : []
  return { order, hidden }
})

const moduleVisible = (id: string) =>
  props.mode !== 'home' || !homeModules.value.hidden.includes(id)

const moduleOrder = (id: string) => {
  if (props.mode !== 'home') return 0
  const index = homeModules.value.order.indexOf(id)
  return index < 0 ? 99 : index
}

const accentColor = computed(() => {
  const value = String(
    getSetting('app:appearance.home.accentColor') || '#171717',
  )
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#171717'
})

const cornerRadius = computed(() => {
  const value = Number(getSetting('app:appearance.home.cornerRadius') ?? 2)
  return Math.max(0, Math.min(16, Number.isFinite(value) ? value : 2))
})

const headingFont = computed(() => {
  const value = getSetting('app:appearance.home.headingFont')
  if (value === 'serif') {
    return 'Georgia, Cambria, "Times New Roman", serif'
  }
  if (value === 'wenkai') {
    return 'var(--font-display)'
  }
  return 'var(--font-sans)'
})

const surfaceStyle = computed(() =>
  String(getSetting('app:appearance.home.surfaceStyle') || 'clean'),
)

const surfaceClass = computed(
  () =>
    ({
      clean: 'bg-white dark:bg-neutral-950',
      soft: 'bg-neutral-50 dark:bg-neutral-950',
      contrast: 'bg-white dark:bg-black',
    })[surfaceStyle.value] || 'bg-white dark:bg-neutral-950',
)

const themeStyle = computed(() => ({
  '--la-accent': accentColor.value,
  '--la-radius': `${cornerRadius.value}px`,
  '--la-heading-font': headingFont.value,
}))

const configuredLayout = computed<GalleryLayout>(() => {
  const value = String(getSetting('app:appearance.home.layout') || 'masonry')
  if (value === 'feed') return 'big'
  return ['big', 'masonry', 'grid'].includes(value)
    ? (value as GalleryLayout)
    : 'masonry'
})
const visitorLayout = ref<GalleryLayout | null>(null)
const visitorColumns = ref<GalleryColumns | null>(null)
const galleryLayout = computed(
  () => visitorLayout.value || configuredLayout.value,
)
const galleryColumns = computed<GalleryColumns>(() => {
  if (props.columns !== 'auto') return props.columns
  return visitorColumns.value ?? 'auto'
})
const imageRatio = computed(() => {
  const value = String(
    getSetting('app:appearance.home.imageRatio') || 'natural',
  )
  return ['natural', 'square', 'landscape'].includes(value)
    ? (value as 'natural' | 'square' | 'landscape')
    : 'natural'
})
const galleryImageRatio = computed(() =>
  galleryLayout.value === 'grid'
    ? imageRatio.value === 'natural'
      ? 'square'
      : imageRatio.value
    : 'natural',
)
const contentWidth = computed(() =>
  String(getSetting('app:appearance.home.contentWidth') || 'wide'),
)
const galleryDensity = computed(() =>
  String(getSetting('app:appearance.home.density') || 'comfortable'),
)
const masonryGap = computed(() => {
  const value = Number(getSetting('app:appearance.home.galleryGap') ?? 12)
  return Math.min(24, Math.max(4, Number.isFinite(value) ? value : 12))
})
const columnWidth = computed(() => {
  if (galleryColumns.value === 'auto') {
    const widths = {
      compact: isMobile.value ? 180 : 260,
      comfortable: isMobile.value ? 220 : 320,
      airy: isMobile.value ? 260 : 380,
    }
    return (
      widths[galleryDensity.value as keyof typeof widths] ?? widths.comfortable
    )
  }
  return 320
})

const maxColumns = computed(() => {
  if (galleryColumns.value !== 'auto') {
    return isMobile.value
      ? Math.min(2, galleryColumns.value)
      : galleryColumns.value
  }
  if (isMobile.value) return 2

  const value = Number(getSetting('app:appearance.home.maxColumns') ?? 6)
  return Math.min(8, Math.max(2, Number.isFinite(value) ? value : 6))
})

const minColumns = computed(() => {
  if (galleryColumns.value !== 'auto') {
    return isMobile.value
      ? Math.min(2, galleryColumns.value)
      : galleryColumns.value
  }
  return 2
})

const galleryMaxWidth = computed(() => {
  return (
    {
      contained: '1280px',
      wide: '1600px',
      full: '1920px',
    }[contentWidth.value] ?? '1600px'
  )
})

const gridClass = computed(() => {
  const classes: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
    7: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7',
    8: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8',
  }

  return classes[maxColumns.value] ?? classes[6]
})

// Prepare items for masonry-wall
const masonryItems = computed(() => {
  return (
    displayPhotos.value?.map((photo, index) => ({
      id: photo.id,
      photo,
      originalIndex: index,
    })) ?? []
  )
})

const masonryKeyMapper = (
  _item: unknown,
  _column: number,
  _row: number,
  index: number,
) => masonryItems.value[index]?.originalIndex ?? index

const photoStats = computed(() => {
  const totalPhotos = displayPhotos.value?.length || 0
  const photosWithDates =
    displayPhotos.value?.filter((p) => p.dateTaken).length || 0
  const photosWithTitles =
    displayPhotos.value?.filter((p) => p.title).length || 0
  const photosWithExif = displayPhotos.value?.filter((p) => p.exif).length || 0

  // Get date range of all photos
  const allDates = displayPhotos.value
    ?.map((p) => p?.dateTaken)
    .filter((date): date is string => Boolean(date))
    .map((date) => dayjs(date).format('ll'))
    .sort((a, b) => (dayjs(a).isBefore(dayjs(b)) ? 1 : -1))

  const dateRange =
    allDates.length > 0
      ? {
          start: allDates[0],
          end: allDates[allDates.length - 1],
        }
      : null

  return {
    total: totalPhotos,
    withDates: photosWithDates,
    withTitles: photosWithTitles,
    withExif: photosWithExif,
    dateRange,
  }
})

const dateRangeText = computed(() => {
  const range = photoStats.value?.dateRange
  if (!range || !range.start || !range.end) return ''
  return `${range.start} - ${range.end}`
})

const handleVisibilityChange = ({
  index,
  isVisible,
}: {
  index: number
  isVisible: boolean
  date: string | Date
}) => {
  if (isVisible) {
    visiblePhotos.value.add(index)
  } else {
    visiblePhotos.value.delete(index)
  }
  updateDateRange()

  // Process LivePhotos for visible photos
  nextTick(() => {
    processVisibleLivePhotos()
  })
}

// Process LivePhotos for currently visible photos
const processVisibleLivePhotos = async () => {
  const visiblePhotosArray = Array.from(visiblePhotos.value)
  const livePhotosToProcess = visiblePhotosArray
    .map((index) => displayPhotos.value[index])
    .filter(
      (photo): photo is Photo =>
        photo != null &&
        photo.isLivePhoto === 1 &&
        Boolean(photo.livePhotoVideoUrl) &&
        !processedBatch.value.has(photo.id),
    )

  if (livePhotosToProcess.length === 0) return

  // Mark as processed to avoid reprocessing
  livePhotosToProcess.forEach((photo) => {
    processedBatch.value.add(photo.id)
  })

  // Start background processing
  batchProcessLivePhotos(
    livePhotosToProcess.map((photo) => ({
      id: photo.id,
      livePhotoVideoUrl: photo.livePhotoVideoUrl!,
    })),
  )
}

const visibleCities = ref<string>()

const updateDateRange = () => {
  if (visiblePhotos.value.size === 0) {
    dateRange.value = undefined
    visibleCities.value = undefined
    return
  }

  const visiblePhotosArray = Array.from(visiblePhotos.value)

  // Calculate visible dates
  const visibleDates = visiblePhotosArray
    .map((index) => displayPhotos.value[index]?.dateTaken)
    .filter((date): date is string => Boolean(date))
    .map((date) => dayjs(date))
    .sort((a, b) => (a.isBefore(b) ? -1 : 1))

  // Calculate visible cities
  const cities = visiblePhotosArray
    .map((index) => displayPhotos.value[index]?.city)
    .filter((city): city is string => Boolean(city))

  const uniqueCities = [...new Set(cities)]

  if (uniqueCities.length === 0) {
    visibleCities.value = undefined
  } else if (uniqueCities.length === 1) {
    visibleCities.value = uniqueCities[0]
  } else if (uniqueCities.length <= 3) {
    visibleCities.value = uniqueCities.join('、')
  } else {
    visibleCities.value =
      `${uniqueCities.slice(0, 2).join('、')} ` +
      $t('ui.indexPanelCountCity', { count: uniqueCities.length })
  }

  if (visibleDates.length === 0) {
    dateRange.value = undefined
    return
  }

  const startDate = visibleDates[0]
  const endDate = visibleDates[visibleDates.length - 1]

  if (!startDate || !endDate) {
    dateRange.value = undefined
    return
  }

  // Check if dates are the same day
  if (startDate.isSame(endDate, 'day')) {
    // Same day
    dateRange.value = startDate.format('ll')
  } else if (startDate.isSame(endDate, 'month')) {
    // Same month
    dateRange.value = startDate.format('MMM YYYY')
  } else if (startDate.isSame(endDate, 'year')) {
    // Same year, different months
    dateRange.value = `${startDate.format('MMM')} - ${endDate.format('MMM YYYY')}`
  } else {
    // Different years
    dateRange.value = `${startDate.format('ll')} - ${endDate.format('ll')}`
  }
}

const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  showFloatingActions.value = scrollTop > 500
}

const requestLocation = () => {
  if (!import.meta.client || !navigator.geolocation) {
    locationStatus.value = 'denied'
    return
  }

  locationStatus.value = 'loading'
  navigator.geolocation.getCurrentPosition(
    (position) => {
      visitorLocation.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      locationStatus.value = 'ready'
      localStorage.setItem(
        'lumaatlas:discovery-location',
        JSON.stringify(visitorLocation.value),
      )
    },
    () => {
      locationStatus.value = 'denied'
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
  )
}

const setViewMode = (value: HomeViewMode) => {
  const query = { ...route.query }
  if (value === configuredSource.value) delete query.view
  else query.view = value
  if (value === 'random') query.seed = String(Date.now())
  else delete query.seed
  router.replace({ query })

  if ((value === 'nearby' || value === 'faraway') && !visitorLocation.value) {
    requestLocation()
  }
}

const setGalleryLayout = (value: GalleryLayout) => {
  visitorLayout.value = value
  saveGalleryPreferences()
}

const setGalleryColumns = (value: GalleryColumns) => {
  visitorColumns.value = value
  saveGalleryPreferences()
}

const saveGalleryPreferences = () => {
  if (!import.meta.client) return
  localStorage.setItem(
    GALLERY_PREFERENCES_KEY,
    JSON.stringify({
      layout: visitorLayout.value,
      columns: visitorColumns.value,
    }),
  )
}

const resetEmptyView = () => {
  clearAllFilters()
  setViewMode('all')
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })

  const savedPreferences = localStorage.getItem(GALLERY_PREFERENCES_KEY)
  if (savedPreferences) {
    try {
      const preferences = JSON.parse(savedPreferences) as {
        layout?: GalleryLayout
        columns?: GalleryColumns
      }
      if (
        preferences.layout &&
        ['big', 'masonry', 'grid'].includes(preferences.layout)
      ) {
        visitorLayout.value = preferences.layout
      }
      if (
        preferences.columns === 'auto' ||
        (typeof preferences.columns === 'number' &&
          preferences.columns >= 2 &&
          preferences.columns <= 8)
      ) {
        visitorColumns.value = preferences.columns
      }
    } catch {
      localStorage.removeItem(GALLERY_PREFERENCES_KEY)
    }
  }

  const savedLocation = localStorage.getItem('lumaatlas:discovery-location')
  if (savedLocation) {
    try {
      visitorLocation.value = JSON.parse(savedLocation) as DiscoveryLocation
      locationStatus.value = 'ready'
    } catch {
      localStorage.removeItem('lumaatlas:discovery-location')
    }
  }

  if (
    (viewMode.value === 'nearby' || viewMode.value === 'faraway') &&
    !visitorLocation.value
  ) {
    requestLocation()
  }

  nextTick(() => {
    if (currentPhotoIndex.value) {
      scrollToPhoto(currentPhotoIndex.value)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const handleOpenViewer = (index: number) => {
  router.push(`/${displayPhotos.value[index]?.id}`)
}

const scrollToPhoto = (photoIndex: number) => {
  if (!displayPhotos.value[photoIndex]) return

  const photoId = displayPhotos.value[photoIndex].id
  const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`)

  if (photoElement) {
    const elementRect = photoElement.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const currentScrollY = window.pageYOffset

    // 让图片在视口中央
    const targetScrollY =
      currentScrollY +
      elementRect.top -
      windowHeight / 2 +
      elementRect.height / 2

    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: 'smooth',
    })
  }
}

watch(currentPhotoIndex, (newIndex) => {
  if (isViewerOpen.value && newIndex >= 0) {
    nextTick(() => {
      scrollToPhoto(newIndex)
    })
  }
})
</script>

<template>
  <div
    class="relative flex min-h-svh w-full flex-col"
    :class="surfaceClass"
    :style="themeStyle"
  >
    <MasonryItemHeader
      v-if="showHeader && moduleVisible('header')"
      :stats="photoStats"
      :date-range-text
      :max-width="galleryMaxWidth"
      :view-mode="viewMode"
      :layout-mode="galleryLayout"
      :column-count="galleryColumns"
      :show-context="false"
      :style="{ order: moduleOrder('header') }"
      @update:view-mode="setViewMode"
      @update:layout-mode="setGalleryLayout"
      @update:column-count="setGalleryColumns"
    />

    <MasonryItemContext
      v-if="showHeader && moduleVisible('header')"
      :stats="photoStats"
      :date-range-text
      :max-width="galleryMaxWidth"
      :style="{ order: moduleOrder('header') }"
    />

    <DateRangeIndicator
      :date-range="dateRange"
      :locations="visibleCities"
      :is-visible="
        !!dateRange && showFloatingActions && galleryLayout !== 'big'
      "
      :is-mobile="isMobile"
    />

    <!-- Back to Top Button -->
    <motion.div
      v-if="showFloatingActions"
      class="fixed bottom-6 right-6 z-50"
      :initial="{ opacity: 0, scale: 0.8 }"
      :animate="{ opacity: 1, scale: 1 }"
      :exit="{ opacity: 0, scale: 0.8 }"
      :transition="{ duration: 0.2 }"
    >
      <UTooltip :text="$t('ui.action.backtotop.tooltip') || '回到顶部'">
        <UButton
          variant="soft"
          color="neutral"
          class="cursor-pointer bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm flex justify-center items-center rounded-full shadow-lg hover:bg-white dark:hover:bg-neutral-800 transition-all duration-300 border border-neutral-200/50 dark:border-neutral-700/50"
          icon="lucide:arrow-up"
          size="lg"
          :aria-label="$t('ui.action.backtotop.ariaLabel') || '回到顶部'"
          @click="scrollToTop"
        />
      </UTooltip>
    </motion.div>

    <div
      v-if="moduleVisible('gallery')"
      class="mx-auto w-full px-3 pb-3 sm:px-5 sm:pb-5 lg:px-7 lg:pb-7"
      :style="{ maxWidth: galleryMaxWidth, order: moduleOrder('gallery') }"
    >
      <div class="relative">
        <section
          v-if="
            (viewMode === 'nearby' || viewMode === 'faraway') &&
            locationStatus !== 'ready'
          "
          class="mx-auto flex max-w-lg flex-col items-center py-20 text-center"
        >
          <Icon
            name="lucide:map-pin"
            class="size-6 text-neutral-400"
          />
          <h2 class="font-display mt-4 text-lg font-semibold">
            {{ $t('discovery.location.title') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-neutral-500">
            {{
              locationStatus === 'denied'
                ? $t('discovery.location.denied')
                : $t('discovery.location.description')
            }}
          </p>
          <UButton
            class="mt-5"
            color="neutral"
            icon="lucide:navigation"
            :loading="locationStatus === 'loading'"
            @click="requestLocation"
          >
            {{ $t('discovery.location.action') }}
          </UButton>
        </section>

        <section
          v-else-if="photosStatus === 'pending' && photos.length === 0"
          class="flex min-h-[48svh] flex-col items-center justify-center text-center"
          aria-live="polite"
        >
          <img
            v-if="siteLogo"
            :src="siteLogo"
            :alt="siteTitle"
            class="size-16 object-contain"
          />
          <span
            v-else
            class="flex size-16 items-center justify-center border border-neutral-200 dark:border-neutral-800"
          >
            <Icon
              name="lucide:aperture"
              class="size-8 animate-pulse text-neutral-400"
            />
          </span>
          <p
            class="mt-4 text-2xl font-semibold text-neutral-800 dark:text-neutral-100"
            style="font-family: var(--la-heading-font)"
          >
            {{ siteTitle }}
          </p>
          <p class="mt-2 text-base text-neutral-500">
            {{ $t('discovery.loading') }}
          </p>
        </section>

        <section
          v-else-if="displayPhotos.length === 0"
          class="flex min-h-[48svh] flex-col items-center justify-center px-4 text-center"
        >
          <Icon
            name="lucide:image"
            class="size-6 text-neutral-400"
          />
          <h2 class="font-display mt-4 text-lg font-semibold">
            {{ $t('discovery.empty.title') }}
          </h2>
          <p class="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
            {{
              photos.length === 0
                ? $t('discovery.empty.noPublicPhotos')
                : $t('discovery.empty.description')
            }}
          </p>
          <UButton
            v-if="photos.length > 0"
            class="mt-5"
            color="neutral"
            variant="outline"
            icon="lucide:rotate-ccw"
            @click="resetEmptyView"
          >
            {{ $t('discovery.empty.reset') }}
          </UButton>
        </section>

        <MasonryWall
          v-else-if="galleryLayout === 'masonry'"
          :items="masonryItems"
          :column-width="columnWidth"
          :gap="masonryGap"
          :min-columns="minColumns"
          :max-columns="maxColumns"
          :ssr-columns="2"
          :key-mapper="masonryKeyMapper"
        >
          <template #default="{ item }">
            <!-- Photo Items -->
            <MasonryItem
              v-if="item.photo && typeof item.originalIndex === 'number'"
              :key="item.photo.id"
              :photo="item.photo"
              :index="item.originalIndex"
              :has-animated
              :first-screen-items="FIRST_SCREEN_ITEMS_COUNT"
              presentation="masonry"
              image-ratio="natural"
              @visibility-change="handleVisibilityChange"
              @open-viewer="handleOpenViewer($event)"
            />
          </template>
        </MasonryWall>

        <div
          v-else
          :class="[
            'grid',
            galleryLayout === 'grid' ? gridClass : 'grid-cols-1',
          ]"
          :style="{
            gap:
              galleryLayout === 'big'
                ? `${Math.max(36, masonryGap * 3)}px`
                : `${masonryGap}px`,
          }"
        >
          <MasonryItem
            v-for="item in masonryItems"
            :key="item.photo.id"
            :photo="item.photo"
            :index="item.originalIndex"
            :has-animated
            :first-screen-items="FIRST_SCREEN_ITEMS_COUNT"
            :presentation="galleryLayout"
            :image-ratio="galleryImageRatio"
            @visibility-change="handleVisibilityChange"
            @open-viewer="handleOpenViewer($event)"
          />
        </div>
      </div>
    </div>

    <MasonryItemFooter
      v-if="mode === 'home' && moduleVisible('footer')"
      :max-width="galleryMaxWidth"
      :style="{ order: moduleOrder('footer') }"
    />
  </div>
</template>
