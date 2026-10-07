<script setup lang="ts">
import { motion } from 'motion-v'
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

const { filteredPhotos, hasActiveFilters } = usePhotoFilters()
const { sortedPhotos } = usePhotoSort()

const displayPhotos = computed(() => {
  if (props.mode === 'collection') {
    return props.photos
  }

  const photos = hasActiveFilters.value
    ? filteredPhotos.value
    : sortedPhotos.value
  const source = String(getSetting('app:appearance.home.source') || 'all')

  return source === 'featured'
    ? photos.filter((photo) => photo.isFeatured)
    : photos
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
const galleryLayout = computed(() => {
  const value = String(getSetting('app:appearance.home.layout') || 'masonry')
  return ['masonry', 'grid', 'feed'].includes(value)
    ? (value as 'masonry' | 'grid' | 'feed')
    : 'masonry'
})
const imageRatio = computed(() => {
  const value = String(
    getSetting('app:appearance.home.imageRatio') || 'natural',
  )
  return ['natural', 'square', 'landscape'].includes(value)
    ? (value as 'natural' | 'square' | 'landscape')
    : 'natural'
})
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
  if (props.columns === 'auto') {
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
  if (props.columns !== 'auto') {
    return props.columns
  }
  if (isMobile.value) return 2

  const value = Number(getSetting('app:appearance.home.maxColumns') ?? 6)
  return Math.min(8, Math.max(2, Number.isFinite(value) ? value : 6))
})

const minColumns = computed(() => {
  if (props.columns !== 'auto') {
    return props.columns
  }
  return 2
})

const galleryMaxWidth = computed(() => {
  if (galleryLayout.value === 'feed') {
    return (
      {
        contained: '880px',
        wide: '1080px',
        full: '1280px',
      }[contentWidth.value] ?? '1080px'
    )
  }

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

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })

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
  <div class="relative w-full">
    <MasonryItemHeader
      v-if="showHeader"
      :stats="photoStats"
      :date-range-text
      :max-width="galleryMaxWidth"
    />

    <DateRangeIndicator
      :date-range="dateRange"
      :locations="visibleCities"
      :is-visible="!!dateRange && showFloatingActions"
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
          icon="tabler:arrow-up"
          size="lg"
          :aria-label="$t('ui.action.backtotop.ariaLabel') || '回到顶部'"
          @click="scrollToTop"
        />
      </UTooltip>
    </motion.div>

    <div
      class="mx-auto px-3 pb-3 sm:px-5 sm:pb-5 lg:px-7 lg:pb-7"
      :style="{ maxWidth: galleryMaxWidth }"
    >
      <div class="relative">
        <MasonryWall
          v-if="galleryLayout === 'masonry'"
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
              :image-ratio="imageRatio"
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
              galleryLayout === 'feed'
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
            :image-ratio="imageRatio"
            @visibility-change="handleVisibilityChange"
            @open-viewer="handleOpenViewer($event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
