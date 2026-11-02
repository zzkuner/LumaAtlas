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

const navItems = computed(() => {
  const navigation = getSetting('app:appearance.home.navigation')
  const configuredOrder =
    navigation && typeof navigation === 'object' && !Array.isArray(navigation)
      ? (navigation as Record<string, unknown>).order
      : []
  const allowedOrder = ['globe', 'albums', 'about']
  const order = [
    ...new Set([
      ...(Array.isArray(configuredOrder) ? configuredOrder : []),
      ...allowedOrder,
    ]),
  ].filter(
    (item): item is string =>
      typeof item === 'string' && allowedOrder.includes(item),
  )
  const pages = {
    globe: {
      to: '/globe',
      label: $t('title.globe'),
      visible: showGlobeNav.value,
    },
    albums: {
      to: '/albums',
      label: $t('title.albums'),
      visible: showAlbumsNav.value,
    },
    about: {
      to: '/about',
      label: $t('title.about'),
      visible: showAboutNav.value,
    },
  }

  return [
    { to: '/', label: $t('title.home'), visible: true },
    ...order.map((id) => pages[id as keyof typeof pages]),
  ]
})

const viewItems: Array<{
  value: HomeViewMode
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'all',
    label: $t('discovery.modes.all.label'),
    description: $t('discovery.modes.all.description'),
    icon: 'lucide:images',
  },
  {
    value: 'featured',
    label: $t('discovery.modes.featured.label'),
    description: $t('discovery.modes.featured.description'),
    icon: 'lucide:sparkles',
  },
  {
    value: 'recent',
    label: $t('discovery.modes.recent.label'),
    description: $t('discovery.modes.recent.description'),
    icon: 'lucide:clock-3',
  },
  {
    value: 'random',
    label: $t('discovery.modes.random.label'),
    description: $t('discovery.modes.random.description'),
    icon: 'lucide:dices',
  },
  {
    value: 'nearby',
    label: $t('discovery.modes.nearby.label'),
    description: $t('discovery.modes.nearby.description'),
    icon: 'lucide:navigation',
  },
  {
    value: 'faraway',
    label: $t('discovery.modes.faraway.label'),
    description: $t('discovery.modes.faraway.description'),
    icon: 'lucide:plane',
  },
]

const gallerySettingsOpen = ref(false)
const currentViewItem = computed(
  () =>
    viewItems.find((item) => item.value === props.viewMode) || viewItems[0]!,
)

const selectViewMode = (value: HomeViewMode) => {
  emit('update:viewMode', value)
  gallerySettingsOpen.value = false
}

const selectLayoutMode = (value: GalleryLayout) => {
  emit('update:layoutMode', value)
}

const layoutItems: Array<{
  value: GalleryLayout
  label: string
  icon: string
}> = [
  { value: 'big', label: '大图', icon: 'lucide:gallery-vertical-end' },
  { value: 'masonry', label: '瀑布流', icon: 'lucide:panels-top-left' },
  { value: 'grid', label: '方格', icon: 'lucide:grid-2x2' },
]
const currentLayoutItem = computed(
  () =>
    layoutItems.find((item) => item.value === props.layoutMode) ||
    layoutItems[0]!,
)

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
    class="sticky top-0 z-40 w-full shrink-0 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/90"
    style="font-family: var(--la-heading-font)"
  >
    <div
      class="mx-auto px-3 py-3 sm:px-5 lg:px-7"
      :style="{ maxWidth: resolvedMaxWidth }"
    >
      <div class="relative flex min-h-10 items-center justify-between gap-3">
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
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <Icon
              name="lucide:aperture"
              class="size-6"
            />
          </span>
          <span class="truncate text-xl font-medium sm:text-2xl">{{
            siteTitle
          }}</span>
        </NuxtLink>

        <nav
          class="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-base text-neutral-500 lg:flex dark:text-neutral-400"
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

          <UPopover
            v-if="showGalleryControls"
            class="sm:hidden"
          >
            <UTooltip :text="currentLayoutItem.label">
              <UButton
                :icon="currentLayoutItem.icon"
                size="sm"
                color="neutral"
                variant="ghost"
                :aria-label="`布局：${currentLayoutItem.label}`"
              />
            </UTooltip>
            <template #content>
              <div class="w-64 p-3 font-sans">
                <p class="mb-2 text-xs text-neutral-500">展示方式</p>
                <div class="grid grid-cols-3 gap-1">
                  <UButton
                    v-for="item in layoutItems"
                    :key="item.value"
                    :icon="item.icon"
                    :label="item.label"
                    size="sm"
                    color="neutral"
                    :variant="layoutMode === item.value ? 'soft' : 'ghost'"
                    class="justify-center"
                    @click="selectLayoutMode(item.value)"
                  />
                </div>
                <template v-if="layoutMode !== 'big'">
                  <p class="mb-2 mt-4 text-xs text-neutral-500">显示列数</p>
                  <div class="grid grid-cols-4 gap-1">
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
                </template>
              </div>
            </template>
          </UPopover>

          <UDrawer
            v-if="showGalleryControls"
            v-model:open="gallerySettingsOpen"
            title="浏览"
            description="选择首页展示的照片范围"
            :ui="{
              content: 'max-h-[88svh]',
              body: 'p-0 sm:p-0',
            }"
          >
            <UTooltip text="浏览">
              <UButton
                :icon="currentViewItem.icon"
                size="sm"
                color="neutral"
                :variant="viewMode === 'all' ? 'ghost' : 'soft'"
                aria-label="浏览"
              >
                <span class="hidden lg:inline">{{
                  currentViewItem.label
                }}</span>
              </UButton>
            </UTooltip>

            <template #body>
              <div
                class="mx-auto w-full max-w-3xl overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6"
              >
                <section>
                  <p class="mb-3 text-sm font-medium text-neutral-500">
                    浏览照片
                  </p>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      v-for="item in viewItems"
                      :key="item.value"
                      type="button"
                      class="flex min-h-24 items-start gap-3 rounded-md border p-3 text-left transition-colors"
                      :class="
                        viewMode === item.value
                          ? 'border-[var(--la-accent)] bg-neutral-100 text-neutral-950 dark:bg-neutral-900 dark:text-white'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900/60'
                      "
                      @click="selectViewMode(item.value)"
                    >
                      <Icon
                        :name="item.icon"
                        class="mt-0.5 size-5 shrink-0"
                      />
                      <span class="min-w-0">
                        <span class="block text-base font-medium">{{
                          item.label
                        }}</span>
                        <span
                          class="mt-1 line-clamp-2 block text-xs leading-5 text-neutral-500 dark:text-neutral-400"
                          >{{ item.description }}</span
                        >
                      </span>
                    </button>
                  </div>
                </section>
              </div>
            </template>
          </UDrawer>

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
        class="scrollbar-hidden mt-3 flex gap-5 overflow-x-auto border-t border-neutral-200 pt-3 text-base text-neutral-500 lg:hidden dark:border-neutral-800 dark:text-neutral-400"
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
    </div>
  </header>
</template>
