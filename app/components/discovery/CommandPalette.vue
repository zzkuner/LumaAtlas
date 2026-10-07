<script setup lang="ts">
const router = useRouter()
const { photos } = usePhotos()
const { loggedIn } = useUserSession()
const { isCommandPaletteOpen, closeCommandPalette } = useCommandPalette()

const query = ref('')
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')

const photoResults = computed(() => {
  const value = query.value.trim().toLowerCase()
  if (!value) return photos.value.slice(0, 6)

  return photos.value
    .filter((photo) =>
      [
        photo.title,
        photo.description,
        photo.tags?.join(' '),
        photo.city,
        photo.country,
        photo.locationName,
        photo.exif?.Make,
        photo.exif?.Model,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value),
    )
    .slice(0, 8)
})

const navigationItems = computed(() => [
  { label: $t('title.gallery'), icon: 'lucide:images', to: '/' },
  { label: $t('discovery.title'), icon: 'lucide:compass', to: '/explore' },
  { label: $t('title.globe'), icon: 'lucide:globe-2', to: '/globe' },
  { label: $t('title.albums'), icon: 'lucide:library', to: '/albums' },
  ...(loggedIn.value
    ? [
        {
          label: $t('title.dashboard'),
          icon: 'lucide:layout-dashboard',
          to: '/dashboard',
        },
      ]
    : []),
])

const openPath = async (path: string) => {
  closeCommandPalette()
  query.value = ''
  await router.push(path)
}

const openSearch = async () => {
  const value = query.value.trim()
  await openPath(value ? `/explore?q=${encodeURIComponent(value)}` : '/explore')
}

watch(isCommandPaletteOpen, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  searchInput.value?.focus()
})

const onKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }
  if (event.key === 'Escape') closeCommandPalette()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isCommandPaletteOpen"
      class="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-sm"
      @click.self="closeCommandPalette"
    >
      <section
        class="w-full max-w-2xl overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('discovery.command.title')"
      >
        <form
          class="flex items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800"
          @submit.prevent="openSearch"
        >
          <Icon
            name="lucide:search"
            class="size-5 text-neutral-400"
          />
          <input
            ref="searchInput"
            v-model="query"
            class="h-14 min-w-0 flex-1 bg-transparent text-base text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-white"
            :placeholder="$t('discovery.command.placeholder')"
          />
          <kbd
            class="border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 dark:border-neutral-700"
            >Esc</kbd
          >
        </form>

        <div class="max-h-[65vh] overflow-y-auto p-2">
          <p class="px-2 py-2 text-xs font-medium text-neutral-500">
            {{ $t('discovery.command.navigation') }}
          </p>
          <div class="grid gap-1 sm:grid-cols-2">
            <button
              v-for="item in navigationItems"
              :key="item.to"
              type="button"
              class="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              @click="openPath(item.to)"
            >
              <Icon
                :name="item.icon"
                class="size-4"
              />
              {{ item.label }}
            </button>
          </div>

          <div
            class="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-800"
          >
            <div class="flex items-center justify-between px-2 py-2">
              <p class="text-xs font-medium text-neutral-500">
                {{ $t('discovery.command.photos') }}
              </p>
              <button
                v-if="query"
                type="button"
                class="text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
                @click="openSearch"
              >
                {{ $t('discovery.command.viewAll') }}
              </button>
            </div>

            <button
              v-for="photo in photoResults"
              :key="photo.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
              @click="openPath(`/${photo.id}`)"
            >
              <ThumbImage
                :src="photo.thumbnailUrl || ''"
                :sources="photo.thumbnailVariants"
                sizes="48px"
                :alt="photo.title || photo.id"
                :thumbhash="photo.thumbnailHash"
                class="size-12 shrink-0 rounded-sm object-cover"
              />
              <span class="min-w-0">
                <span
                  class="block truncate text-sm font-medium text-neutral-950 dark:text-white"
                >
                  {{ photo.title || $t('discovery.untitled') }}
                </span>
                <span class="block truncate text-xs text-neutral-500">
                  {{
                    [photo.city, photo.dateTaken?.slice(0, 10)]
                      .filter(Boolean)
                      .join(' · ')
                  }}
                </span>
              </span>
            </button>

            <div
              v-if="photoResults.length === 0"
              class="px-3 py-8 text-center text-sm text-neutral-500"
            >
              {{ $t('discovery.command.noResults') }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
