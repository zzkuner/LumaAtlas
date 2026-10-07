<script lang="ts" setup>
defineProps<{
  stats?: {
    total: number
    dateRange: {
      start: string | undefined
      end: string | undefined
    } | null
  }
  dateRangeText: string
  maxWidth?: string
}>()

const router = useRouter()
const colorMode = useColorMode()

const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteDescription = computed(() =>
  String(getSetting('app:description') || ''),
)
const homeStyle = computed(() =>
  String(getSetting('app:appearance.home.style') || 'minimal'),
)
const isEditorial = computed(() => homeStyle.value === 'editorial')
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
const showExploreNav = computed(
  () => getSetting('app:appearance.home.showExploreNav') !== false,
)
const rssEnabled = computed(
  () => getSetting('publishing:rss.enabled') !== false,
)

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(value) {
    colorMode.preference = value ? 'dark' : 'light'
  },
})

const { hasActiveFilters, selectedCounts } = usePhotoFilters()
const {
  currentSortLabel,
  currentSortIcon,
  currentSortOption,
  availableSorts,
  setSortOption,
} = usePhotoSort()

const totalSelectedFilters = computed(() => {
  return Object.values(selectedCounts.value).reduce(
    (total, count) => total + count,
    0,
  )
})

const handleOpenLogin = () => {
  router.push('/signin')
}

const { openCommandPalette } = useCommandPalette()
</script>

<template>
  <header class="w-full">
    <div
      class="mx-auto px-3 pt-6 pb-5 sm:px-5 sm:pt-8 lg:px-7"
      :style="{ maxWidth: maxWidth || '1600px' }"
    >
      <AuthState>
        <template #default="{ loggedIn, clear }">
          <div class="flex min-h-10 items-center justify-between gap-4">
            <NuxtLink
              to="/"
              class="group inline-flex min-w-0 items-center gap-2.5 text-neutral-950 dark:text-white"
              aria-label="LumaAtlas home"
            >
              <span
                class="flex size-7 shrink-0 items-center justify-center border border-neutral-900 dark:border-white"
              >
                <Icon
                  name="lucide:aperture"
                  class="size-4"
                />
              </span>
              <span class="truncate text-lg font-semibold">{{
                siteTitle
              }}</span>
            </NuxtLink>

            <nav
              class="hidden items-center gap-7 text-sm font-medium text-neutral-500 sm:flex dark:text-neutral-400"
              :aria-label="$t('title.gallery')"
            >
              <NuxtLink
                to="/"
                class="text-neutral-950 transition-colors dark:text-white"
              >
                {{ $t('title.gallery') }}
              </NuxtLink>
              <NuxtLink
                v-if="showExploreNav"
                to="/explore"
                class="transition-colors hover:text-neutral-950 dark:hover:text-white"
              >
                {{ $t('discovery.title') }}
              </NuxtLink>
              <NuxtLink
                v-if="showGlobeNav"
                to="/globe"
                class="transition-colors hover:text-neutral-950 dark:hover:text-white"
              >
                {{ $t('title.globe') }}
              </NuxtLink>
              <NuxtLink
                v-if="showAlbumsNav"
                to="/albums"
                class="transition-colors hover:text-neutral-950 dark:hover:text-white"
              >
                {{ $t('title.albums') }}
              </NuxtLink>
            </nav>

            <div class="flex shrink-0 items-center gap-0.5">
              <UTooltip :text="$t('discovery.command.title')">
                <UButton
                  variant="ghost"
                  color="neutral"
                  icon="lucide:search"
                  size="sm"
                  class="rounded-md"
                  :aria-label="$t('discovery.command.title')"
                  @click="openCommandPalette"
                />
              </UTooltip>
              <UPopover>
                <UTooltip :text="$t('ui.action.filter.tooltip')">
                  <UChip
                    inset
                    size="sm"
                    color="info"
                    :show="totalSelectedFilters > 0"
                  >
                    <UButton
                      variant="ghost"
                      :color="hasActiveFilters ? 'info' : 'neutral'"
                      icon="lucide:list-filter"
                      size="sm"
                      class="rounded-md"
                      :aria-label="$t('ui.action.filter.tooltip')"
                    />
                  </UChip>
                </UTooltip>

                <template #content>
                  <UCard variant="glassmorphism">
                    <OverlayFilterPanel />
                  </UCard>
                </template>
              </UPopover>

              <UPopover>
                <UTooltip :text="$t('ui.action.sort.tooltip')">
                  <UButton
                    variant="ghost"
                    :color="
                      currentSortOption?.key === 'dateTaken-desc'
                        ? 'neutral'
                        : 'info'
                    "
                    :icon="currentSortIcon"
                    size="sm"
                    class="rounded-md"
                    :aria-label="$t('ui.action.sort.tooltip')"
                  />
                </UTooltip>

                <template #content>
                  <UCard
                    variant="glassmorphism"
                    class="w-3xs"
                  >
                    <template #header>
                      <h3 class="p-1 text-sm font-semibold">
                        {{ $t('ui.action.sort.title') }}
                      </h3>
                    </template>

                    <div class="space-y-1">
                      <UButton
                        v-for="sort in availableSorts"
                        :key="sort.key"
                        :variant="
                          currentSortLabel === sort.labelI18n ? 'soft' : 'ghost'
                        "
                        :color="
                          currentSortLabel === sort.labelI18n
                            ? 'info'
                            : 'neutral'
                        "
                        :icon="sort.icon"
                        size="sm"
                        block
                        class="justify-start rounded-md"
                        @click="setSortOption(sort.key)"
                      >
                        {{ $t(sort.labelI18n) }}
                      </UButton>
                    </div>
                  </UCard>
                </template>
              </UPopover>

              <UTooltip
                v-if="rssEnabled"
                :text="$t('ui.action.rss.tooltip')"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  class="rounded-md"
                  icon="lucide:rss"
                  size="sm"
                  to="/rss.xml"
                  target="_blank"
                  :aria-label="$t('ui.action.rss.tooltip')"
                />
              </UTooltip>

              <UTooltip :text="$t('ui.action.theme.tooltip')">
                <UButton
                  variant="ghost"
                  color="neutral"
                  class="rounded-md"
                  :icon="isDark ? 'lucide:sun' : 'lucide:moon'"
                  size="sm"
                  :aria-label="$t('ui.action.theme.tooltip')"
                  @click="isDark = !isDark"
                />
              </UTooltip>

              <UTooltip
                v-if="loggedIn"
                :text="$t('ui.action.dashboard.tooltip')"
              >
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  class="rounded-md"
                  icon="lucide:layout-dashboard"
                  to="/dashboard"
                  :aria-label="$t('ui.action.dashboard.tooltip')"
                />
              </UTooltip>

              <UTooltip
                v-if="loggedIn"
                :text="$t('ui.action.logout.tooltip')"
              >
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  class="rounded-md"
                  icon="lucide:log-out"
                  :aria-label="$t('ui.action.logout.tooltip')"
                  @click="clear"
                />
              </UTooltip>

              <UTooltip
                v-else
                :text="$t('auth.form.signin.title')"
              >
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  class="rounded-md"
                  icon="lucide:user-round"
                  :aria-label="$t('auth.form.signin.title')"
                  @click="handleOpenLogin"
                />
              </UTooltip>
            </div>
          </div>

          <nav
            class="mt-5 flex items-center gap-6 border-t border-neutral-200 pt-4 text-sm font-medium text-neutral-500 sm:hidden dark:border-neutral-800 dark:text-neutral-400"
            :aria-label="$t('title.gallery')"
          >
            <NuxtLink
              to="/"
              class="text-neutral-950 dark:text-white"
            >
              {{ $t('title.gallery') }}
            </NuxtLink>
            <NuxtLink
              v-if="showExploreNav"
              to="/explore"
              class="transition-colors"
            >
              {{ $t('discovery.title') }}
            </NuxtLink>
            <NuxtLink
              v-if="showGlobeNav"
              to="/globe"
              class="transition-colors"
            >
              {{ $t('title.globe') }}
            </NuxtLink>
            <NuxtLink
              v-if="showAlbumsNav"
              to="/albums"
              class="transition-colors"
            >
              {{ $t('title.albums') }}
            </NuxtLink>
          </nav>

          <div
            class="mt-8 flex flex-col gap-4 border-t border-neutral-200 pt-5 sm:mt-10 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800"
          >
            <div class="flex min-w-0 items-center gap-4">
              <img
                v-if="isEditorial && getSetting('app:avatarUrl')"
                :src="String(getSetting('app:avatarUrl'))"
                :alt="String(getSetting('app:author') || siteTitle)"
                class="size-14 shrink-0 rounded-full object-cover"
              />
              <div class="min-w-0">
                <p
                  :class="
                    isEditorial
                      ? 'text-xl font-semibold text-neutral-950 sm:text-2xl dark:text-white'
                      : 'text-sm font-medium text-neutral-950 dark:text-white'
                  "
                >
                  {{ isEditorial ? siteTitle : $t('title.gallery') }}
                </p>
                <p
                  v-if="showSlogan && getSetting('app:slogan')"
                  class="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
                >
                  {{ getSetting('app:slogan') }}
                </p>
                <p
                  v-if="isEditorial && siteDescription"
                  class="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400"
                >
                  {{ siteDescription }}
                </p>
              </div>
            </div>
            <p
              v-if="showStats"
              class="shrink-0 text-xs text-neutral-500 dark:text-neutral-500"
            >
              <template v-if="stats?.total">
                {{
                  $t('ui.stats.totalPhotosWithRange', {
                    range: dateRangeText,
                    count: stats.total,
                  })
                }}
              </template>
              <template v-else>
                {{ $t('ui.stats.noPhotosTip') }}
              </template>
            </p>
          </div>
        </template>
      </AuthState>
    </div>
  </header>
</template>
