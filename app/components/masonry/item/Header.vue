<script lang="ts" setup>
import type { DiscoveryMode } from '~/composables/usePhotoDiscovery'

type HomeViewMode = 'all' | DiscoveryMode
type GalleryLayout = 'big' | 'masonry' | 'grid'

withDefaults(
  defineProps<{
    stats?: {
      total: number
      dateRange: { start?: string; end?: string } | null
    }
    dateRangeText?: string
    maxWidth?: string
    viewMode?: HomeViewMode
    layoutMode?: GalleryLayout
    showGalleryControls?: boolean
    showContext?: boolean
  }>(),
  {
    dateRangeText: '',
    maxWidth: '1600px',
    viewMode: 'all',
    layoutMode: 'masonry',
    showGalleryControls: true,
    showContext: true,
  },
)

const emit = defineEmits<{
  'update:viewMode': [value: HomeViewMode]
  'update:layoutMode': [value: GalleryLayout]
}>()

const colorMode = useColorMode()
const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteLogo = computed(() => String(getSetting('app:logoUrl') || ''))
const siteAuthor = computed(() => String(getSetting('app:author') || ''))
const siteSlogan = computed(() => String(getSetting('app:slogan') || ''))
const siteDescription = computed(() =>
  String(getSetting('app:description') || ''),
)
const avatarUrl = computed(() => String(getSetting('app:avatarUrl') || ''))
const showAuthorIntro = computed(
  () => getSetting('app:appearance.home.showAuthorIntro') !== false,
)
const showSlogan = computed(
  () => getSetting('app:appearance.home.showSlogan') !== false,
)
const showStats = computed(
  () => getSetting('app:appearance.home.showStats') !== false,
)
const showGlobeNav = computed(
  () => getSetting('app:appearance.home.showGlobeNav') !== false,
)
const showAlbumsNav = computed(
  () => getSetting('app:appearance.home.showAlbumsNav') !== false,
)
const showAboutNav = computed(
  () => getSetting('app:appearance.home.showAboutNav') === true,
)

const navItems = computed(() => [
  { to: '/', label: $t('title.home'), visible: true },
  { to: '/globe', label: $t('title.globe'), visible: showGlobeNav.value },
  { to: '/albums', label: $t('title.albums'), visible: showAlbumsNav.value },
  { to: '/about', label: $t('title.about'), visible: showAboutNav.value },
])

const viewItems: Array<{
  value: HomeViewMode
  label: string
}> = [
  { value: 'all', label: $t('discovery.modes.all.label') },
  { value: 'featured', label: $t('discovery.modes.featured.label') },
  { value: 'recent', label: $t('discovery.modes.recent.label') },
  { value: 'random', label: $t('discovery.modes.random.label') },
  { value: 'nearby', label: $t('discovery.modes.nearby.label') },
  { value: 'faraway', label: $t('discovery.modes.faraway.label') },
]

const layoutItems: Array<{
  value: GalleryLayout
  label: string
  icon: string
}> = [
  { value: 'big', label: '大图', icon: 'lucide:rectangle-vertical' },
  { value: 'masonry', label: '瀑布流', icon: 'lucide:layout-dashboard' },
  { value: 'grid', label: '方格', icon: 'lucide:grid-3x3' },
]

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})
const toggleColorMode = () => {
  isDark.value = !isDark.value
}

const { hasActiveFilters, selectedCounts } = usePhotoFilters()
const totalSelectedFilters = computed(() =>
  Object.values(selectedCounts.value).reduce(
    (total, count) => total + count,
    0,
  ),
)
const {
  currentSortLabel,
  currentSortIcon,
  currentSortOption,
  availableSorts,
  setSortOption,
} = usePhotoSort()

const introTitle = computed(() => siteAuthor.value || siteTitle.value)
const introCopy = computed(() =>
  showSlogan.value ? siteSlogan.value || siteDescription.value : '',
)
</script>

<template>
  <header class="w-full font-display">
    <div class="mx-auto px-3 pb-3 pt-4 sm:px-5 lg:max-w-[1600px] lg:px-7">
      <div class="flex min-h-10 items-center justify-between gap-3">
        <NuxtLink
          to="/"
          class="inline-flex min-w-0 items-center gap-2.5 text-neutral-950 dark:text-white"
        >
          <img
            v-if="siteLogo"
            :src="siteLogo"
            :alt="siteTitle"
            class="size-8 shrink-0 object-contain"
          />
          <span
            v-else
            class="flex size-8 shrink-0 items-center justify-center border"
            :style="{ borderColor: 'var(--la-accent)' }"
          >
            <Icon
              name="lucide:aperture"
              class="size-4"
            />
          </span>
          <span class="truncate text-lg font-semibold">{{ siteTitle }}</span>
        </NuxtLink>

        <nav
          class="hidden items-center gap-7 text-sm text-neutral-500 md:flex dark:text-neutral-400"
          aria-label="Primary navigation"
        >
          <NuxtLink
            v-for="item in navItems.filter((item) => item.visible)"
            :key="item.to"
            :to="item.to"
            class="transition-colors hover:text-neutral-950 dark:hover:text-white"
            active-class="text-neutral-950 dark:text-white"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="flex shrink-0 items-center gap-0.5 font-sans">
          <div
            v-if="showGalleryControls"
            class="hidden items-center border-r border-neutral-200 pr-1 sm:flex dark:border-neutral-800"
          >
            <UTooltip
              v-for="item in layoutItems"
              :key="item.value"
              :text="item.label"
            >
              <UButton
                :icon="item.icon"
                size="sm"
                color="neutral"
                :variant="layoutMode === item.value ? 'soft' : 'ghost'"
                :aria-label="item.label"
                :aria-pressed="layoutMode === item.value"
                @click="emit('update:layoutMode', item.value)"
              />
            </UTooltip>
          </div>

          <UPopover v-if="showGalleryControls">
            <UTooltip :text="$t('ui.action.filter.tooltip')">
              <UChip
                inset
                size="sm"
                color="info"
                :show="totalSelectedFilters > 0"
              >
                <UButton
                  icon="lucide:list-filter"
                  size="sm"
                  :color="hasActiveFilters ? 'info' : 'neutral'"
                  variant="ghost"
                  :aria-label="$t('ui.action.filter.tooltip')"
                />
              </UChip>
            </UTooltip>
            <template #content>
              <UCard
                class="max-w-[calc(100vw-1rem)]"
                variant="glassmorphism"
              >
                <OverlayFilterPanel />
              </UCard>
            </template>
          </UPopover>

          <UPopover v-if="showGalleryControls">
            <UTooltip :text="$t('ui.action.sort.tooltip')">
              <UButton
                :icon="currentSortIcon"
                size="sm"
                :color="
                  currentSortOption?.key === 'dateTaken-desc'
                    ? 'neutral'
                    : 'info'
                "
                variant="ghost"
                :aria-label="$t('ui.action.sort.tooltip')"
              />
            </UTooltip>
            <template #content>
              <div class="w-60 space-y-1 p-2">
                <UButton
                  v-for="sort in availableSorts"
                  :key="sort.key"
                  :icon="sort.icon"
                  :variant="
                    currentSortLabel === sort.labelI18n ? 'soft' : 'ghost'
                  "
                  color="neutral"
                  size="sm"
                  block
                  class="justify-start"
                  @click="setSortOption(sort.key)"
                >
                  {{ $t(sort.labelI18n) }}
                </UButton>
              </div>
            </template>
          </UPopover>

          <UTooltip :text="$t('ui.action.theme.tooltip')">
            <UButton
              :icon="isDark ? 'lucide:sun' : 'lucide:moon'"
              size="sm"
              color="neutral"
              variant="ghost"
              :aria-label="$t('ui.action.theme.tooltip')"
              @click="toggleColorMode"
            />
          </UTooltip>
        </div>
      </div>

      <nav
        class="mt-3 flex gap-5 overflow-x-auto border-t border-neutral-200 pt-3 text-sm text-neutral-500 md:hidden dark:border-neutral-800 dark:text-neutral-400"
        aria-label="Primary navigation"
      >
        <NuxtLink
          v-for="item in navItems.filter((item) => item.visible)"
          :key="item.to"
          :to="item.to"
          class="shrink-0"
          active-class="text-neutral-950 dark:text-white"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div
        v-if="showGalleryControls"
        class="mt-3 flex items-center justify-between gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800"
      >
        <div
          class="flex min-w-0 gap-5 overflow-x-auto text-sm text-neutral-500 dark:text-neutral-400"
        >
          <button
            v-for="item in viewItems"
            :key="item.value"
            type="button"
            class="shrink-0 transition-colors hover:text-neutral-950 dark:hover:text-white"
            :class="
              viewMode === item.value
                ? 'font-semibold text-neutral-950 dark:text-white'
                : ''
            "
            @click="emit('update:viewMode', item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="flex shrink-0 items-center sm:hidden font-sans">
          <UTooltip
            v-for="item in layoutItems"
            :key="item.value"
            :text="item.label"
          >
            <UButton
              :icon="item.icon"
              size="xs"
              color="neutral"
              :variant="layoutMode === item.value ? 'soft' : 'ghost'"
              :aria-label="item.label"
              @click="emit('update:layoutMode', item.value)"
            />
          </UTooltip>
        </div>
      </div>

      <div
        v-if="showContext && (showAuthorIntro || showStats)"
        class="mt-3 flex flex-col gap-3 border-t border-neutral-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800"
      >
        <div
          v-if="showAuthorIntro"
          class="flex min-w-0 items-center gap-3"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="introTitle"
            class="size-9 shrink-0 rounded-full object-cover"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ introTitle }}</p>
            <p
              v-if="introCopy"
              class="mt-0.5 line-clamp-1 text-xs text-neutral-500"
            >
              {{ introCopy }}
            </p>
          </div>
        </div>
        <p
          v-if="showStats"
          class="shrink-0 font-sans text-xs text-neutral-500"
        >
          <template v-if="stats?.total">
            {{
              $t('ui.stats.totalPhotosWithRange', {
                range: dateRangeText,
                count: stats.total,
              })
            }}
          </template>
          <template v-else>{{ $t('ui.stats.noPhotosTip') }}</template>
        </p>
      </div>
    </div>
  </header>
</template>
