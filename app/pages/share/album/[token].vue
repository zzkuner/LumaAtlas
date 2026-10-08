<script setup lang="ts">
import type { Photo } from '~~/server/utils/db'
import type { SharedAlbumPayload } from '~~/shared/types/album-share'

definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => String(route.params.token))
const password = ref('')
const unlocking = ref(false)
const unlockError = ref(false)
const selectedIndex = ref(0)
const viewerOpen = ref(false)
const toast = useToast()

const {
  data: payload,
  error,
  pending,
} = await useFetch<SharedAlbumPayload>(
  () => `/api/shares/albums/${token.value}`,
  {
    watch: [token],
  },
)

const photos = computed<Photo[]>(() => payload.value?.photos || [])
const coverPhoto = computed(() => {
  if (!payload.value?.album) return null
  return (
    photos.value.find(
      (photo) => photo.id === payload.value?.album.coverPhotoId,
    ) || photos.value[0]
  )
})
const masonryItems = computed(() =>
  photos.value.map((photo, index) => ({
    id: photo.id,
    photo,
    originalIndex: index,
  })),
)

useHead(() => ({
  title: payload.value?.album.title || $t('albumShare.pageTitle'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}))

const unlock = async () => {
  if (!password.value) return
  unlocking.value = true
  unlockError.value = false
  try {
    payload.value = await $fetch<SharedAlbumPayload>(
      `/api/shares/albums/${token.value}`,
      { method: 'POST', body: { password: password.value } },
    )
    password.value = ''
  } catch {
    unlockError.value = true
  } finally {
    unlocking.value = false
  }
}

const openViewer = (index: number) => {
  selectedIndex.value = index
  viewerOpen.value = true
}

const shareAlbum = async () => {
  const data = {
    title: payload.value?.album.title || 'Album',
    url: window.location.href,
  }
  if (navigator.share) {
    await navigator.share(data)
  } else {
    await navigator.clipboard.writeText(data.url)
    toast.add({ title: $t('albumShare.copied'), color: 'success' })
  }
}

const downloadCurrent = async () => {
  const photo = photos.value[selectedIndex.value]
  if (!photo?.originalUrl || !payload.value?.share.allowOriginalDownload) return
  const anchor = document.createElement('a')
  anchor.href = photo.originalUrl
  anchor.download = photo.title || photo.id
  anchor.target = '_blank'
  anchor.click()
}
</script>

<template>
  <main
    class="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <div
      v-if="pending"
      class="flex min-h-screen items-center justify-center"
    >
      <Icon
        name="lucide:loader-circle"
        class="size-7 animate-spin text-neutral-400"
      />
    </div>

    <div
      v-else-if="error"
      class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center"
    >
      <Icon
        name="lucide:link-2-off"
        class="size-10 text-neutral-400"
      />
      <h1 class="mt-5 text-2xl font-semibold">
        {{ $t('albumShare.unavailable') }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-neutral-500">
        {{ $t('albumShare.unavailableHint') }}
      </p>
    </div>

    <template v-else-if="payload">
      <div
        v-if="payload.requiresPassword && !payload.photos"
        class="relative flex min-h-screen items-center justify-center overflow-hidden px-5"
      >
        <img
          v-if="coverPhoto?.thumbnailUrl"
          :src="coverPhoto.thumbnailUrl"
          alt=""
          class="absolute inset-0 size-full object-cover opacity-15 blur-3xl"
        />
        <form
          class="relative z-10 w-full max-w-sm border border-neutral-200 bg-white/90 p-7 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/90"
          @submit.prevent="unlock"
        >
          <Icon
            name="lucide:lock-keyhole"
            class="size-6 text-neutral-500"
          />
          <h1 class="mt-5 text-2xl font-semibold">{{ payload.album.title }}</h1>
          <p class="mt-2 text-sm leading-6 text-neutral-500">
            {{ $t('albumShare.passwordRequired') }}
          </p>
          <UFormField
            :label="$t('albumShare.password')"
            :error="
              unlockError ? $t('albumShare.incorrectPassword') : undefined
            "
            class="mt-6"
          >
            <UInput
              v-model="password"
              type="password"
              autofocus
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            color="neutral"
            block
            class="mt-4"
            :loading="unlocking"
          >
            {{ $t('albumShare.open') }}
          </UButton>
        </form>
      </div>

      <template v-else>
        <header class="border-b border-neutral-200 dark:border-neutral-800">
          <div
            class="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between px-4 sm:px-7"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex size-8 items-center justify-center bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
              >
                <Icon
                  name="lucide:aperture"
                  class="size-4"
                />
              </div>
              <span class="truncate text-sm font-semibold">LumaAtlas</span>
            </div>
            <div class="flex items-center gap-1">
              <UButton
                v-if="payload.share.allowOriginalDownload"
                icon="lucide:download"
                color="neutral"
                variant="ghost"
                :aria-label="$t('albumShare.download')"
                @click="downloadCurrent"
              />
              <UButton
                icon="lucide:share-2"
                color="neutral"
                variant="ghost"
                :aria-label="$t('albumShare.share')"
                @click="shareAlbum"
              />
            </div>
          </div>
        </header>

        <section
          class="mx-auto max-w-[1600px] px-4 pb-7 pt-10 sm:px-7 sm:pb-10 sm:pt-16"
        >
          <div class="max-w-3xl">
            <p class="text-xs font-medium uppercase text-neutral-500">
              {{ $t('albumShare.sharedAlbum') }}
            </p>
            <h1 class="mt-3 text-3xl font-semibold sm:text-5xl">
              {{ payload.album.title }}
            </h1>
            <p
              v-if="payload.album.description"
              class="mt-4 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base dark:text-neutral-400"
            >
              {{ payload.album.description }}
            </p>
            <div class="mt-5 flex flex-wrap gap-4 text-xs text-neutral-500">
              <span class="flex items-center gap-1.5">
                <Icon
                  name="lucide:images"
                  class="size-3.5"
                />
                {{ $t('albumShare.photoCount', { count: photos.length }) }}
              </span>
              <span
                v-if="payload.share.expiresAt"
                class="flex items-center gap-1.5"
              >
                <Icon
                  name="lucide:clock-3"
                  class="size-3.5"
                />
                {{
                  $t('albumShare.expires', {
                    date: new Date(payload.share.expiresAt).toLocaleString(),
                  })
                }}
              </span>
            </div>
          </div>
        </section>

        <section class="mx-auto max-w-[1600px] px-1 pb-12 sm:px-3">
          <div
            v-if="photos.length === 0"
            class="flex min-h-52 flex-col items-center justify-center text-neutral-500"
          >
            <Icon
              name="lucide:image-off"
              class="size-8"
            />
            <p class="mt-3 text-sm">{{ $t('albumShare.empty') }}</p>
          </div>
          <MasonryWall
            v-else
            :items="masonryItems"
            :column-width="300"
            :gap="6"
            :min-columns="2"
            :max-columns="7"
            :ssr-columns="2"
          >
            <template #default="{ item }">
              <MasonryItem
                :photo="item.photo"
                :index="item.originalIndex"
                :has-animated="false"
                :first-screen-items="40"
                @open-viewer="openViewer($event)"
              />
            </template>
          </MasonryWall>
        </section>

        <PhotoViewer
          :photos="photos"
          :current-index="selectedIndex"
          :is-open="viewerOpen"
          :allow-share="false"
          :show-info="payload.share.showExif"
          @close="viewerOpen = false"
          @index-change="selectedIndex = $event"
        />
      </template>
    </template>
  </main>
</template>
