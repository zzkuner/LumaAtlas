<script lang="ts" setup>
const route = useRoute()
const router = useRouter()
const dayjs = useDayjs()

const albumId = computed(() =>
  Number.parseInt(route.params.albumId as string, 10),
)
const {
  data: albumData,
  error,
  pending,
} = await useFetch(() => `/api/albums/${albumId.value}`, { watch: [albumId] })

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Album not found' })
}

useHead({ title: () => albumData.value?.title || $t('title.albums') })

const contentMaxWidth = computed(() => {
  const width = String(getSetting('app:appearance.home.contentWidth') || 'wide')
  return (
    {
      contained: '1280px',
      wide: '1600px',
      full: '1920px',
    }[width] || '1600px'
  )
})

const albumStats = computed(() => {
  const photos = albumData.value?.photos || []
  const dates = photos
    .map((photo) => photo.dateTaken)
    .filter((date): date is string => Boolean(date))
    .map((date) => dayjs(date))
    .sort((a, b) => (a.isBefore(b) ? -1 : 1))

  return {
    total: photos.length,
    start: dates[0],
    end: dates[dates.length - 1],
  }
})

const dateRangeText = computed(() => {
  const { start, end } = albumStats.value
  if (!start || !end) return ''
  if (start.isSame(end, 'day')) return start.format('ll')
  if (start.isSame(end, 'month')) return start.format('MMM YYYY')
  if (start.isSame(end, 'year')) {
    return `${start.format('MMM')} - ${end.format('MMM YYYY')}`
  }
  return `${start.format('ll')} - ${end.format('ll')}`
})

const masonryItems = computed(
  () =>
    albumData.value?.photos?.map((photo, index) => ({
      id: photo.id,
      photo,
      originalIndex: index,
    })) || [],
)

const isMobile = useMediaQuery('(max-width: 768px)')
const columnWidth = computed(() => (isMobile.value ? 220 : 320))
const maxColumns = computed(() => (isMobile.value ? 2 : 6))
const masonryGap = computed(() => {
  const value = Number(getSetting('app:appearance.home.galleryGap') ?? 12)
  return Math.min(24, Math.max(4, Number.isFinite(value) ? value : 12))
})

const masonryKeyMapper = (
  _item: unknown,
  _column: number,
  _row: number,
  index: number,
) => masonryItems.value[index]?.originalIndex ?? index

const handleOpenViewer = (index: number) => {
  const photo = albumData.value?.photos?.[index]
  if (!photo) return

  useViewerState().openViewer(index, `/albums/${albumId.value}`)
  router.push(`/${photo.id}`)
}

const showBackToTop = ref(false)
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 500
}
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() =>
  window.addEventListener('scroll', handleScroll, { passive: true }),
)
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<template>
  <div
    class="min-h-svh bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <MasonryItemHeader :show-gallery-controls="false" />

    <main
      class="mx-auto w-full px-3 pb-20 pt-6 sm:px-5 sm:pt-9 lg:px-7"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <div
        v-if="pending"
        class="flex min-h-[55svh] items-center justify-center"
      >
        <Icon
          name="lucide:loader-circle"
          class="size-7 animate-spin text-neutral-400"
        />
      </div>

      <template v-else-if="albumData">
        <UButton
          to="/albums"
          icon="lucide:arrow-left"
          color="neutral"
          variant="ghost"
          label="返回相册"
          class="-ml-2"
        />

        <header
          class="mt-5 flex flex-col gap-5 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800"
        >
          <div class="min-w-0">
            <h1 class="font-display text-3xl font-semibold sm:text-4xl">
              {{ albumData.title }}
            </h1>
            <p
              v-if="albumData.description"
              class="mt-3 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400"
            >
              {{ albumData.description }}
            </p>
          </div>
          <div
            class="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400"
          >
            <span class="inline-flex items-center gap-1.5">
              <Icon
                name="lucide:image"
                class="size-4"
              />
              {{ albumStats.total }} 张
            </span>
            <span
              v-if="dateRangeText"
              class="inline-flex items-center gap-1.5"
            >
              <Icon
                name="lucide:calendar-days"
                class="size-4"
              />
              {{ dateRangeText }}
            </span>
          </div>
        </header>

        <section class="pt-8">
          <div
            v-if="albumStats.total === 0"
            class="flex min-h-[44svh] flex-col items-center justify-center text-center"
          >
            <Icon
              name="lucide:images"
              class="size-7 text-neutral-400"
            />
            <p class="font-display mt-4 text-lg font-semibold">
              {{ $t('album.emptyAlbumTitle') }}
            </p>
          </div>

          <MasonryWall
            v-else
            :items="masonryItems"
            :column-width="columnWidth"
            :gap="masonryGap"
            :min-columns="2"
            :max-columns="maxColumns"
            :ssr-columns="2"
            :key-mapper="masonryKeyMapper"
          >
            <template #default="{ item }">
              <MasonryItem
                v-if="item.photo && typeof item.originalIndex === 'number'"
                :key="item.photo.id"
                :photo="item.photo"
                :index="item.originalIndex"
                :has-animated="false"
                :first-screen-items="50"
                presentation="masonry"
                @open-viewer="handleOpenViewer($event)"
              />
            </template>
          </MasonryWall>
        </section>
      </template>

      <div
        v-else
        class="flex min-h-[55svh] flex-col items-center justify-center text-center"
      >
        <Icon
          name="lucide:circle-alert"
          class="size-8 text-neutral-400"
        />
        <p class="font-display mt-4 text-xl font-semibold">
          {{ $t('album.failedToLoadTitle') }}
        </p>
        <UButton
          class="mt-5"
          to="/albums"
          color="neutral"
          variant="outline"
        >
          {{ $t('album.backToAlbums') }}
        </UButton>
      </div>
    </main>

    <UTooltip
      v-if="showBackToTop"
      :text="$t('ui.action.backtotop.tooltip') || '回到顶部'"
    >
      <UButton
        class="fixed bottom-6 right-6 z-50 rounded-full border border-neutral-200 bg-white/90 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90"
        icon="lucide:arrow-up"
        color="neutral"
        variant="ghost"
        size="lg"
        :aria-label="$t('ui.action.backtotop.ariaLabel') || '回到顶部'"
        @click="scrollToTop"
      />
    </UTooltip>
  </div>
</template>
