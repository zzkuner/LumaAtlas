<script setup lang="ts">
import type {
  DiscoveryLocation,
  DiscoveryMode,
} from '~/composables/usePhotoDiscovery'

definePageMeta({
  layout: false,
})

useHead({ title: $t('discovery.title') })

const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
const { photos } = usePhotos()
const { openCommandPalette } = useCommandPalette()

const allowedModes: DiscoveryMode[] = [
  'featured',
  'recent',
  'random',
  'nearby',
  'faraway',
]

const mode = computed<DiscoveryMode>(() => {
  const value = String(route.query.view || 'recent') as DiscoveryMode
  return allowedModes.includes(value) ? value : 'recent'
})
const searchQuery = ref(String(route.query.q || ''))
const location = ref<DiscoveryLocation | null>(null)
const locationStatus = ref<'idle' | 'loading' | 'ready' | 'denied'>('idle')
const radiusKm = computed(() => {
  const value = Number(route.query.radius || 100)
  return Number.isFinite(value) ? Math.min(2000, Math.max(1, value)) : 100
})
const randomSeed = computed(() => Number(route.query.seed || 1) || 1)
const selectedTag = computed(() => String(route.query.tag || ''))
const selectedCity = computed(() => String(route.query.city || ''))

const updateQuery = (updates: Record<string, string | number | undefined>) => {
  const query = { ...route.query }
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '') delete query[key]
    else query[key] = String(value)
  }
  router.replace({ query })
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(
    () => updateQuery({ q: value.trim() || undefined }),
    200,
  )
})
watch(
  () => route.query.q,
  (value) => {
    const nextValue = String(value || '')
    if (nextValue !== searchQuery.value) searchQuery.value = nextValue
  },
)

const modeItems = computed(() =>
  allowedModes.map((value) => ({
    value,
    label: $t(`discovery.modes.${value}.label`),
    description: $t(`discovery.modes.${value}.description`),
    icon: {
      featured: 'lucide:sparkles',
      recent: 'lucide:clock-3',
      random: 'lucide:dices',
      nearby: 'lucide:navigation',
      faraway: 'lucide:plane',
    }[value],
  })),
)

const popularTags = computed(() => {
  const counts = new Map<string, number>()
  for (const photo of photos.value) {
    for (const tag of photo.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }))
})

const popularCities = computed(() => {
  const counts = new Map<string, number>()
  for (const photo of photos.value) {
    if (photo.city) counts.set(photo.city, (counts.get(photo.city) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }))
})

const discoveryPhotos = computed(() =>
  discoverPhotos(photos.value, {
    mode: mode.value,
    query: searchQuery.value,
    tag: selectedTag.value,
    city: selectedCity.value,
    location: location.value,
    radiusKm: radiusKm.value,
    randomSeed: randomSeed.value,
  }),
)

const currentMode = computed(() =>
  modeItems.value.find((item) => item.value === mode.value),
)

const needsLocation = computed(
  () => mode.value === 'nearby' || mode.value === 'faraway',
)

const requestLocation = () => {
  if (!import.meta.client || !navigator.geolocation) {
    locationStatus.value = 'denied'
    return
  }

  locationStatus.value = 'loading'
  navigator.geolocation.getCurrentPosition(
    (position) => {
      location.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      locationStatus.value = 'ready'
      localStorage.setItem(
        'lumaatlas:discovery-location',
        JSON.stringify(location.value),
      )
    },
    () => {
      locationStatus.value = 'denied'
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
  )
}

const setMode = (value: DiscoveryMode) => {
  updateQuery({ view: value === 'recent' ? undefined : value })
  if ((value === 'nearby' || value === 'faraway') && !location.value) {
    requestLocation()
  }
}

const reshuffle = () => {
  updateQuery({ view: 'random', seed: Date.now() })
}

const clearFilters = () => {
  searchQuery.value = ''
  updateQuery({ q: undefined, tag: undefined, city: undefined })
}

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})

const toggleColorMode = () => {
  isDark.value = !isDark.value
}

onMounted(() => {
  const savedLocation = localStorage.getItem('lumaatlas:discovery-location')
  if (savedLocation) {
    try {
      location.value = JSON.parse(savedLocation) as DiscoveryLocation
      locationStatus.value = 'ready'
    } catch {
      localStorage.removeItem('lumaatlas:discovery-location')
    }
  }
})
</script>

<template>
  <main
    class="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <header class="border-b border-neutral-200 dark:border-neutral-800">
      <div
        class="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <NuxtLink
          to="/"
          class="inline-flex min-w-0 items-center gap-2.5"
        >
          <span
            class="flex size-7 items-center justify-center border border-neutral-900 dark:border-white"
          >
            <Icon
              name="lucide:aperture"
              class="size-4"
            />
          </span>
          <span class="truncate font-semibold">{{
            getSetting('app:title') || 'LumaAtlas'
          }}</span>
        </NuxtLink>

        <nav class="hidden items-center gap-6 text-sm text-neutral-500 sm:flex">
          <NuxtLink
            to="/"
            class="hover:text-neutral-950 dark:hover:text-white"
            >{{ $t('title.gallery') }}</NuxtLink
          >
          <span class="font-medium text-neutral-950 dark:text-white">{{
            $t('discovery.title')
          }}</span>
          <NuxtLink
            to="/globe"
            class="hover:text-neutral-950 dark:hover:text-white"
            >{{ $t('title.globe') }}</NuxtLink
          >
          <NuxtLink
            to="/albums"
            class="hover:text-neutral-950 dark:hover:text-white"
            >{{ $t('title.albums') }}</NuxtLink
          >
        </nav>

        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="lucide:search"
            :aria-label="$t('discovery.command.title')"
            @click="openCommandPalette"
          />
          <UButton
            color="neutral"
            variant="ghost"
            :icon="isDark ? 'lucide:sun' : 'lucide:moon'"
            :aria-label="$t('ui.action.theme.tooltip')"
            @click="toggleColorMode"
          />
        </div>
      </div>
    </header>

    <section class="mx-auto max-w-[1600px] px-4 pb-8 pt-10 sm:px-6 lg:px-8">
      <div
        class="flex flex-col gap-7 border-b border-neutral-200 pb-8 dark:border-neutral-800"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-neutral-500">
              {{ $t('discovery.eyebrow') }}
            </p>
            <h1 class="mt-1 text-3xl font-semibold sm:text-4xl">
              {{ $t('discovery.title') }}
            </h1>
            <p
              class="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400"
            >
              {{ currentMode?.description }}
            </p>
          </div>
          <label class="relative block w-full lg:max-w-md">
            <Icon
              name="lucide:search"
              class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              v-model="searchQuery"
              class="h-11 w-full border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none transition-colors focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-white"
              :placeholder="$t('discovery.searchPlaceholder')"
            />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button
            v-for="item in modeItems"
            :key="item.value"
            type="button"
            class="flex min-h-12 items-center justify-center gap-2 border px-3 text-sm font-medium transition-colors"
            :class="
              mode === item.value
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400'
            "
            @click="setMode(item.value)"
          >
            <Icon
              :name="item.icon"
              class="size-4"
            />
            {{ item.label }}
          </button>
        </div>

        <div
          v-if="popularTags.length || popularCities.length"
          class="flex flex-wrap items-center gap-2"
        >
          <span class="mr-1 text-xs font-medium text-neutral-500">{{
            $t('discovery.quickFilters')
          }}</span>
          <button
            v-for="tag in popularTags"
            :key="`tag-${tag.label}`"
            type="button"
            class="border px-2.5 py-1 text-xs transition-colors"
            :class="
              selectedTag === tag.label
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400'
            "
            @click="
              updateQuery({
                tag: selectedTag === tag.label ? undefined : tag.label,
              })
            "
          >
            #{{ tag.label }} {{ tag.count }}
          </button>
          <button
            v-for="city in popularCities"
            :key="`city-${city.label}`"
            type="button"
            class="border px-2.5 py-1 text-xs transition-colors"
            :class="
              selectedCity === city.label
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400'
            "
            @click="
              updateQuery({
                city: selectedCity === city.label ? undefined : city.label,
              })
            "
          >
            {{ city.label }} {{ city.count }}
          </button>
          <button
            v-if="searchQuery || selectedTag || selectedCity"
            type="button"
            class="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
            @click="clearFilters"
          >
            {{ $t('discovery.clearFilters') }}
          </button>
        </div>
      </div>

      <div
        class="flex items-center justify-between py-5 text-sm text-neutral-500"
      >
        <span>{{
          $t('discovery.resultCount', { count: discoveryPhotos.length })
        }}</span>
        <div class="flex items-center gap-3">
          <label
            v-if="mode === 'nearby' && locationStatus === 'ready'"
            class="flex items-center gap-2"
          >
            <span>{{ $t('discovery.radius') }}</span>
            <input
              :value="radiusKm"
              type="number"
              min="1"
              max="2000"
              class="h-8 w-20 border border-neutral-300 bg-transparent px-2 text-sm dark:border-neutral-700"
              @change="
                updateQuery({
                  radius: Number(($event.target as HTMLInputElement).value),
                })
              "
            />
            <span>km</span>
          </label>
          <UButton
            v-if="mode === 'random'"
            color="neutral"
            variant="outline"
            size="sm"
            icon="lucide:refresh-cw"
            @click="reshuffle"
          >
            {{ $t('discovery.reshuffle') }}
          </UButton>
        </div>
      </div>
    </section>

    <section
      v-if="needsLocation && locationStatus !== 'ready'"
      class="mx-auto max-w-xl px-4 py-20 text-center"
    >
      <Icon
        name="lucide:map-pin"
        class="mx-auto size-8 text-neutral-400"
      />
      <h2 class="mt-4 text-lg font-semibold">
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
        :loading="locationStatus === 'loading'"
        icon="lucide:navigation"
        @click="requestLocation"
      >
        {{ $t('discovery.location.action') }}
      </UButton>
    </section>

    <MasonryRoot
      v-else-if="discoveryPhotos.length"
      :photos="discoveryPhotos"
      mode="collection"
      :show-header="false"
      columns="auto"
    />

    <section
      v-else
      class="mx-auto max-w-xl px-4 py-20 text-center"
    >
      <Icon
        name="lucide:image-off"
        class="mx-auto size-8 text-neutral-400"
      />
      <h2 class="mt-4 text-lg font-semibold">
        {{ $t('discovery.empty.title') }}
      </h2>
      <p class="mt-2 text-sm text-neutral-500">
        {{ $t('discovery.empty.description') }}
      </p>
      <UButton
        v-if="searchQuery || selectedTag || selectedCity"
        class="mt-5"
        color="neutral"
        variant="outline"
        @click="clearFilters"
      >
        {{ $t('discovery.clearFilters') }}
      </UButton>
    </section>
  </main>
</template>
