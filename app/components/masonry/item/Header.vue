<script lang="ts" setup>
import type { DiscoveryMode } from '~/composables/usePhotoDiscovery'

type HomeViewMode = 'all' | DiscoveryMode
type GalleryLayout = 'big' | 'masonry' | 'grid'
type GalleryColumns = number | 'auto'

const props = withDefaults(
  defineProps<{
    maxWidth?: string
    viewMode?: HomeViewMode
    layoutMode?: GalleryLayout
    columnCount?: GalleryColumns
    showGalleryControls?: boolean
  }>(),
  {
    viewMode: 'all',
    layoutMode: 'masonry',
    columnCount: 'auto',
    showGalleryControls: true,
  },
)

const resolvedMaxWidth = computed(() => {
  if (props.maxWidth) return props.maxWidth

  const contentWidth = String(
    getSetting('app:appearance.home.contentWidth') || 'wide',
  )
  return (
    {
      contained: '1280px',
      wide: '1600px',
      full: '1920px',
    }[contentWidth] || '1600px'
  )
})

const emit = defineEmits<{
  'update:viewMode': [value: HomeViewMode]
  'update:layoutMode': [value: GalleryLayout]
  'update:columnCount': [value: GalleryColumns]
}>()

const colorMode = useColorMode()
const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteLogo = computed(() => String(getSetting('app:logoUrl') || ''))
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
  { value: 'big', label: '大图', icon: 'lucide:gallery-vertical-end' },
  { value: 'masonry', label: '瀑布流', icon: 'lucide:panels-top-left' },
  { value: 'grid', label: '方格', icon: 'lucide:grid-2x2' },
]

const columnItems: Array<{ value: GalleryColumns; label: string }> = [
  { value: 'auto', label: '自动' },
  ...Array.from({ length: 7 }, (_, index) => ({
    value: index + 2,
    label: String(index + 2),
  })),
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
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/90"
    style="font-family: var(--la-heading-font)"
  >
    <div
      class="mx-auto px-3 py-3 sm:px-5 lg:px-7"
      :style="{ maxWidth: resolvedMaxWidth }"
    >
      <div class="flex min-h-10 items-center justify-between gap-3">
        <NuxtLink
          to="/"
          class="inline-flex min-w-0 items-center gap-2.5 text-neutral-950 dark:text-white"
        >
          <img
            v-if="siteLogo"
            :src="siteLogo"
            :alt="siteTitle"
            class="size-10 shrink-0 object-contain"
          />
          <span
            v-else
            class="flex size-10 shrink-0 items-center justify-center border"
            :style="{ borderColor: 'var(--la-accent)' }"
          >
            <Icon
              name="lucide:aperture"
              class="size-5"
            />
          </span>
          <span class="truncate text-xl font-semibold sm:text-2xl">{{
            siteTitle
          }}</span>
        </NuxtLink>

        <nav
          class="hidden items-center gap-7 text-base text-neutral-500 md:flex dark:text-neutral-400"
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
            class="hidden items-center gap-0.5 rounded-md bg-neutral-100 p-1 sm:flex dark:bg-neutral-900"
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

            <UPopover v-if="layoutMode !== 'big'">
              <UTooltip text="显示列数">
                <UButton
                  icon="lucide:columns-3"
                  size="sm"
                  color="neutral"
                  :variant="columnCount === 'auto' ? 'ghost' : 'soft'"
                  aria-label="显示列数"
                />
              </UTooltip>
              <template #content>
                <div class="w-64 p-3 font-sans">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium">显示列数</span>
                    <span class="text-xs text-neutral-500">仅当前浏览器</span>
                  </div>
                  <div class="mt-3 grid grid-cols-4 gap-1">
                    <UButton
                      v-for="item in columnItems"
                      :key="item.value"
                      :label="item.label"
                      size="sm"
                      color="neutral"
                      :variant="columnCount === item.value ? 'soft' : 'ghost'"
                      class="justify-center"
                      @click="emit('update:columnCount', item.value)"
                    />
                  </div>
                </div>
              </template>
            </UPopover>
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
                  icon="lucide:funnel"
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
        class="scrollbar-hidden mt-3 flex gap-5 overflow-x-auto border-t border-neutral-200 pt-3 text-base text-neutral-500 md:hidden dark:border-neutral-800 dark:text-neutral-400"
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
          class="scrollbar-hidden flex min-w-0 gap-5 overflow-x-auto text-base text-neutral-500 dark:text-neutral-400"
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

        <div
          class="flex shrink-0 items-center rounded-md bg-neutral-100 p-0.5 font-sans sm:hidden dark:bg-neutral-900"
        >
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

          <UPopover v-if="layoutMode !== 'big'">
            <UButton
              icon="lucide:columns-3"
              size="xs"
              color="neutral"
              :variant="columnCount === 'auto' ? 'ghost' : 'soft'"
              aria-label="显示列数"
            />
            <template #content>
              <div class="w-64 p-3 font-sans">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium">显示列数</span>
                  <span class="text-xs text-neutral-500">仅当前浏览器</span>
                </div>
                <div class="mt-3 grid grid-cols-4 gap-1">
                  <UButton
                    v-for="item in columnItems"
                    :key="item.value"
                    :label="item.label"
                    size="sm"
                    color="neutral"
                    :variant="columnCount === item.value ? 'soft' : 'ghost'"
                    class="justify-center"
                    @click="emit('update:columnCount', item.value)"
                  />
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
  </header>
</template>
