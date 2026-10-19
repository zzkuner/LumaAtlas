<script lang="ts" setup>
import type { Album } from '~~/server/utils/db'

interface AlbumWithPhotos extends Album {
  photoIds?: string[]
}

const { photos } = usePhotos()
const { loggedIn } = useUserSession()
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

const { data: albums } = useAsyncData<AlbumWithPhotos[]>(
  'albums',
  () => $fetch('/api/albums'),
  { watch: [] },
)

const visibleAlbums = computed(() => {
  if (loggedIn.value) return albums.value || []
  return (albums.value || []).filter((album) => !album.isHidden)
})

const photosById = computed(
  () => new Map(photos.value.map((photo) => [photo.id, photo])),
)

const getAlbumCover = (album: AlbumWithPhotos) => {
  const coverId = album.coverPhotoId || album.photoIds?.[0]
  return coverId ? photosById.value.get(coverId) || null : null
}

const getAlbumCount = (album: AlbumWithPhotos) => album.photoIds?.length || 0
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
          {{ visibleAlbums.length }} 个相册
        </p>
      </header>

      <div
        v-if="visibleAlbums.length"
        class="grid grid-cols-1 gap-x-5 gap-y-10 pt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <NuxtLink
          v-for="album in visibleAlbums"
          :key="album.id"
          :to="`/albums/${album.id}`"
          class="group block min-w-0"
        >
          <div
            class="relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900"
          >
            <ThumbImage
              v-if="getAlbumCover(album)?.thumbnailUrl"
              class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
              :src="getAlbumCover(album)!.thumbnailUrl!"
              :thumbhash="getAlbumCover(album)?.thumbnailHash"
              :alt="album.title"
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
              v-if="album.isHidden && loggedIn"
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
                {{ album.title }}
              </h2>
              <p
                v-if="album.description"
                class="mt-1 line-clamp-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400"
              >
                {{ album.description }}
              </p>
            </div>
            <span
              class="mt-0.5 shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-400"
            >
              {{ getAlbumCount(album) }} 张
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
