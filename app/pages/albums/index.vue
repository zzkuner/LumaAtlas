<script lang="ts" setup>
import type { Album } from '~~/server/utils/db'

if (getSetting('app:appearance.home.showAlbumsNav') === false) {
  await navigateTo('/', { replace: true })
}

interface AlbumWithPhotos extends Album {
  photoIds?: string[]
}

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
} = useAsyncData<AlbumWithPhotos[]>('albums', () => $fetch('/api/albums'), {
  watch: [],
})

const visibleAlbums = computed(() => {
  if (isAdmin.value) return albums.value || []
  return (albums.value || []).filter((album) => !album.isHidden)
})

const photosById = computed(
  () => new Map(photos.value.map((photo) => [photo.id, photo])),
)

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
    class="min-h-svh bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <MasonryItemHeader :show-gallery-controls="false" />

    <main
      class="mx-auto w-full px-3 pb-20 pt-8 sm:px-5 sm:pt-12 lg:px-7"
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
