<script lang="ts" setup>
import type { Album } from '~~/server/utils/db'

if (getSetting('app:appearance.home.showAlbumsNav') === false) {
  await navigateTo('/', { replace: true })
}

interface AlbumWithPhotos extends Album {
  photoIds?: string[]
}

const fetchAlbums = $fetch as unknown as <T>(url: string) => Promise<T>

const { photos } = usePhotos()
const { user } = useUserSession()
const isAdmin = computed(() => Boolean(user.value?.isAdmin))
const siteSlogan = computed(() => String(getSetting('app:slogan') || ''))
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

const {
  data: albums,
  status: albumsStatus,
  error: albumsError,
  refresh: refreshAlbums,
} = useAsyncData<AlbumWithPhotos[]>(
  'albums',
  () => fetchAlbums<AlbumWithPhotos[]>('/api/albums'),
  { watch: [] },
)

const visibleAlbums = computed(() => {
  if (isAdmin.value) return albums.value || []
  return (albums.value || []).filter((album) => !album.isHidden)
})

const photosById = computed(
  () => new Map(photos.value.map((photo) => [photo.id, photo])),
)

const isMobile = useMediaQuery('(max-width: 768px)')
const backgroundColumnCount = computed(() => (isMobile.value ? 3 : 8))
const backgroundPhotos = computed(() =>
  photos.value.filter((photo) => Boolean(photo.thumbnailUrl)).slice(0, 32),
)
const backgroundColumns = computed(() => {
  const columnCount = backgroundColumnCount.value
  const source = backgroundPhotos.value
  const columns = Array.from({ length: columnCount }, () => [] as Photo[])

  if (!source.length) return columns

  const photosPerColumn = 5
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < photosPerColumn; rowIndex += 1) {
      const photoIndex = (columnIndex + rowIndex * columnCount) % source.length
      columns[columnIndex]!.push(source[photoIndex]!)
    }
  }

  return columns
})

const backgroundDuration = (columnIndex: number) =>
  `${82 + ((columnIndex * 13) % 37)}s`

const albumCards = computed(() =>
  visibleAlbums.value.map((album) => {
    const candidateIds = [album.coverPhotoId, ...(album.photoIds || [])].filter(
      (photoId): photoId is string => Boolean(photoId),
    )
    const cover = candidateIds
      .map((photoId) => photosById.value.get(photoId))
      .find((photo): photo is Photo => Boolean(photo))

    return {
      album,
      cover: cover || null,
      count: album.photoIds?.length || 0,
    }
  }),
)
</script>

<template>
  <div
    class="relative min-h-svh overflow-x-hidden bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <MasonryItemHeader
      :show-gallery-controls="false"
      immersive
    />

    <div
      v-if="backgroundPhotos.length"
      class="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 overflow-hidden opacity-45 sm:h-96"
      aria-hidden="true"
    >
      <div class="absolute inset-0 flex gap-px">
        <div
          v-for="(column, columnIndex) in backgroundColumns"
          :key="columnIndex"
          class="relative flex-1 overflow-hidden"
        >
          <div
            class="flex flex-col will-change-transform"
            :class="
              columnIndex % 2 === 0 ? 'album-scroll-up' : 'album-scroll-down'
            "
            :style="{ animationDuration: backgroundDuration(columnIndex) }"
          >
            <template
              v-for="groupIndex in 2"
              :key="groupIndex"
            >
              <div
                v-for="(photo, photoIndex) in column"
                :key="`${photo.id}-${groupIndex}-${photoIndex}`"
                class="w-full overflow-hidden border-b border-white/15"
              >
                <ThumbImage
                  class="h-auto w-full object-cover saturate-50"
                  :lazy="false"
                  :src="photo.thumbnailUrl!"
                  :thumbhash="photo.thumbnailHash"
                  alt=""
                  :style="{ aspectRatio: photo.aspectRatio || 1 }"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
      <div
        class="absolute -inset-1 bg-linear-to-b from-white/90 via-white/75 to-white dark:from-neutral-950/90 dark:via-neutral-950/75 dark:to-neutral-950"
      />
    </div>

    <main
      class="relative z-10 mx-auto w-full px-3 pb-20 pt-40 sm:px-5 sm:pt-44 lg:px-7 lg:pt-36"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <header
        class="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800"
      >
        <div class="min-w-0">
          <p
            class="font-display text-sm text-neutral-500 dark:text-neutral-400"
          >
            影像档案
          </p>
          <h1 class="font-display mt-2 text-3xl font-semibold sm:text-4xl">
            {{ $t('title.albums') }}
          </h1>
          <p
            v-if="siteSlogan"
            class="mt-3 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400"
          >
            {{ siteSlogan }}
          </p>
        </div>
        <p class="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
          {{ albumCards.length }} 个相册
        </p>
      </header>

      <div
        v-if="albumsStatus === 'idle' || albumsStatus === 'pending'"
        class="flex min-h-[50svh] items-center justify-center"
        aria-live="polite"
      >
        <Icon
          name="lucide:loader-circle"
          class="size-7 animate-spin text-neutral-400"
        />
      </div>

      <div
        v-else-if="albumsError"
        class="flex min-h-[50svh] flex-col items-center justify-center text-center"
      >
        <Icon
          name="lucide:circle-alert"
          class="size-7 text-neutral-400"
        />
        <p class="font-display mt-4 text-lg font-semibold">相册加载失败</p>
        <p class="mt-2 text-sm text-neutral-500">请检查网络后重新尝试。</p>
        <UButton
          class="mt-5"
          color="neutral"
          variant="outline"
          icon="lucide:refresh-cw"
          @click="refreshAlbums()"
        >
          重新加载
        </UButton>
      </div>

      <div
        v-else-if="albumCards.length"
        class="grid grid-cols-1 gap-x-5 gap-y-10 pt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <NuxtLink
          v-for="card in albumCards"
          :key="card.album.id"
          :to="`/albums/${card.album.id}`"
          class="group block min-w-0"
        >
          <div
            class="relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900"
          >
            <ThumbImage
              v-if="card.cover?.thumbnailUrl"
              class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
              :src="card.cover.thumbnailUrl"
              :thumbhash="card.cover.thumbnailHash"
              :alt="card.album.title"
            />
            <div
              v-else
              class="flex size-full items-center justify-center text-neutral-400 dark:text-neutral-600"
            >
              <Icon
                name="lucide:images"
                class="size-8"
              />
            </div>

            <span
              v-if="card.album.isHidden && isAdmin"
              class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs text-white backdrop-blur"
            >
              <Icon
                name="lucide:eye-off"
                class="size-3.5"
              />
              未公开
            </span>
          </div>

          <div class="mt-4 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2
                class="font-display truncate text-lg font-semibold text-neutral-900 transition-colors group-hover:text-[var(--la-accent)] dark:text-neutral-100"
              >
                {{ card.album.title }}
              </h2>
              <p
                v-if="card.album.description"
                class="mt-1 line-clamp-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400"
              >
                {{ card.album.description }}
              </p>
            </div>
            <span
              class="mt-0.5 shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-400"
            >
              {{ card.count }} 张
            </span>
          </div>
        </NuxtLink>
      </div>

      <div
        v-else
        class="flex min-h-[50svh] flex-col items-center justify-center text-center"
      >
        <Icon
          name="lucide:images"
          class="size-7 text-neutral-400"
        />
        <p class="font-display mt-4 text-lg font-semibold">还没有公开相册</p>
        <p class="mt-2 text-sm text-neutral-500">照片仍可在首页按时间浏览。</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes album-scroll-up {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}

@keyframes album-scroll-down {
  from {
    transform: translateY(-50%);
  }
  to {
    transform: translateY(0);
  }
}

.album-scroll-up,
.album-scroll-down {
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.album-scroll-up {
  animation-name: album-scroll-up;
}

.album-scroll-down {
  animation-name: album-scroll-down;
}

@media (prefers-reduced-motion: reduce) {
  .album-scroll-up,
  .album-scroll-down {
    animation-play-state: paused;
  }
}
</style>
