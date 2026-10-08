<script setup lang="ts">
interface Props {
  settings: Record<string, unknown>
  title?: string
  slogan?: string
  description?: string
  avatarUrl?: string
  photos?: Photo[]
  viewport?: 'desktop' | 'mobile'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'LumaAtlas',
  slogan: '',
  description: '',
  avatarUrl: '',
  photos: () => [],
  viewport: 'desktop',
})

const setting = (key: string, fallback: unknown) =>
  props.settings[key] ?? fallback

const layout = computed(() =>
  String(setting('appearance.home.layout', 'masonry')),
)
const imageRatio = computed(() =>
  String(setting('appearance.home.imageRatio', 'natural')),
)
const contentWidth = computed(() =>
  String(setting('appearance.home.contentWidth', 'wide')),
)
const isEditorial = computed(
  () => String(setting('appearance.home.style', 'minimal')) === 'editorial',
)
const accentColor = computed(() => {
  const value = String(setting('appearance.home.accentColor', '#171717'))
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#171717'
})
const cornerRadius = computed(() =>
  Math.max(
    0,
    Math.min(16, Number(setting('appearance.home.cornerRadius', 2)) || 0),
  ),
)
const headingFont = computed(() =>
  setting('appearance.home.headingFont', 'sans') === 'serif'
    ? 'Georgia, Cambria, "Times New Roman", serif'
    : 'ui-sans-serif, system-ui, sans-serif',
)
const surfaceStyle = computed(() =>
  String(setting('appearance.home.surfaceStyle', 'clean')),
)
const showSlogan = computed(
  () => setting('appearance.home.showSlogan', true) !== false,
)
const showStats = computed(
  () => setting('appearance.home.showStats', true) !== false,
)
const showGlobeNav = computed(
  () => setting('appearance.home.showGlobeNav', true) !== false,
)
const showAlbumsNav = computed(
  () => setting('appearance.home.showAlbumsNav', true) !== false,
)
const showExploreNav = computed(
  () => setting('appearance.home.showExploreNav', true) !== false,
)

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const moduleSettings = computed(() => {
  const value = asRecord(setting('appearance.home.modules', {}))
  const allowed = ['header', 'gallery', 'footer']
  const source = Array.isArray(value.order) ? value.order : []
  const order = [...new Set([...source, ...allowed])].filter(
    (item): item is string =>
      typeof item === 'string' && allowed.includes(item),
  )
  const hidden = Array.isArray(value.hidden)
    ? value.hidden.filter(
        (item): item is string =>
          typeof item === 'string' && allowed.includes(item),
      )
    : []
  return { order, hidden }
})

const moduleOrder = (id: string) => {
  const index = moduleSettings.value.order.indexOf(id)
  return index < 0 ? 99 : index
}

const moduleVisible = (id: string) => !moduleSettings.value.hidden.includes(id)

const navigationItems = computed(() => {
  const value = asRecord(setting('appearance.home.navigation', {}))
  const allowed = ['explore', 'globe', 'albums']
  const source = Array.isArray(value.order) ? value.order : []
  const order = [...new Set([...source, ...allowed])].filter(
    (item): item is string =>
      typeof item === 'string' && allowed.includes(item),
  )
  const labels: Record<string, string> = {
    explore: 'Explore',
    globe: 'Globe',
    albums: 'Albums',
  }
  const visible: Record<string, boolean> = {
    explore: showExploreNav.value,
    globe: showGlobeNav.value,
    albums: showAlbumsNav.value,
  }
  return order
    .filter((id) => visible[id])
    .map((id) => ({ id, label: labels[id] }))
})

const socialLinks = computed(() => {
  const value = asRecord(setting('appearance.home.socialLinks', {}))
  return Object.values(value).filter((link) => typeof link === 'string' && link)
})

const footerText = computed(() =>
  String(setting('appearance.home.footerText', '')),
)

const frameClass = computed(() =>
  props.viewport === 'mobile' ? 'mx-auto max-w-[238px]' : 'w-full',
)

const surfaceClass = computed(
  () =>
    ({
      clean: 'bg-white dark:bg-neutral-950',
      soft: 'bg-neutral-100 dark:bg-neutral-900',
      contrast:
        'bg-white ring-1 ring-inset ring-neutral-400 dark:bg-black dark:ring-neutral-600',
    })[surfaceStyle.value] || 'bg-white dark:bg-neutral-950',
)

const previewGap = computed(() => {
  const value = Number(setting('appearance.home.galleryGap', 12))
  return `${Math.max(3, Math.min(10, Math.round(value / 2)))}px`
})
const previewColumns = computed(() => {
  const value = Number(setting('appearance.home.maxColumns', 6))
  return Math.max(2, Math.min(4, Number.isFinite(value) ? value : 4))
})
const previewWidthClass = computed(
  () =>
    ({
      contained: 'max-w-[78%]',
      wide: 'max-w-[90%]',
      full: 'max-w-full',
    })[contentWidth.value] || 'max-w-[90%]',
)

const fallbackColors = [
  '#dbeafe',
  '#d1fae5',
  '#fde68a',
  '#e5e7eb',
  '#fecdd3',
  '#ddd6fe',
  '#bae6fd',
  '#fed7aa',
]
const fallbackRatios = [1.45, 0.78, 1.1, 1.6, 0.92, 1.28, 0.7, 1.5]

const previewItems = computed(() => {
  const count = layout.value === 'feed' ? 2 : 8
  return Array.from({ length: count }, (_, index) => {
    const photo = props.photos[index]
    return {
      id: photo?.id || `preview-${index}`,
      src: photo?.thumbnailUrl || '',
      title: photo?.title || `Photo ${String(index + 1).padStart(2, '0')}`,
      color: fallbackColors[index % fallbackColors.length],
      naturalRatio: photo?.aspectRatio || fallbackRatios[index] || 1,
    }
  })
})

const itemRatio = (naturalRatio: number) => {
  if (imageRatio.value === 'square') return 1
  if (imageRatio.value === 'landscape') return 4 / 3
  return naturalRatio
}
</script>

<template>
  <aside>
    <div class="mb-3 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          首页实时预览
        </p>
        <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
          保存前即可查看布局变化
        </p>
      </div>
      <UBadge
        color="neutral"
        variant="outline"
        size="sm"
      >
        {{ viewport === 'mobile' ? 'Mobile' : 'Desktop' }}
      </UBadge>
    </div>

    <div
      class="flex overflow-hidden rounded-md border border-neutral-300 shadow-sm transition-[max-width] dark:border-neutral-700"
      :class="[frameClass, surfaceClass]"
      :style="{
        flexDirection: 'column',
        '--preview-accent': accentColor,
        '--preview-radius': `${cornerRadius}px`,
        '--preview-heading-font': headingFont,
      }"
    >
      <div
        v-if="moduleVisible('header')"
        class="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800"
        :style="{ order: moduleOrder('header') }"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <span
              class="flex size-4 shrink-0 items-center justify-center border"
              :style="{ borderColor: accentColor }"
            >
              <Icon
                name="lucide:aperture"
                class="size-2.5"
              />
            </span>
            <span class="truncate text-[10px] font-semibold">{{ title }}</span>
          </div>
          <div class="flex items-center gap-2 text-[8px] text-neutral-500">
            <span>Gallery</span>
            <span
              v-for="item in navigationItems"
              :key="item.id"
              >{{ item.label }}</span
            >
          </div>
        </div>

        <div
          class="mt-3 flex items-end justify-between gap-3 border-t border-neutral-100 pt-2 dark:border-neutral-900"
        >
          <div class="flex min-w-0 items-center gap-2">
            <img
              v-if="isEditorial && avatarUrl"
              :src="avatarUrl"
              :alt="title"
              class="size-7 shrink-0 rounded-full object-cover"
            />
            <div class="min-w-0">
              <p
                class="truncate text-[10px] font-medium"
                :style="{ fontFamily: headingFont }"
              >
                {{ isEditorial ? title : 'Gallery' }}
              </p>
              <p
                v-if="showSlogan && slogan"
                class="mt-0.5 truncate text-[8px] text-neutral-500"
              >
                {{ slogan }}
              </p>
              <p
                v-if="isEditorial && description"
                class="mt-1 line-clamp-2 text-[8px] leading-3 text-neutral-500"
              >
                {{ description }}
              </p>
            </div>
          </div>
          <span
            v-if="showStats"
            class="shrink-0 text-[8px] text-neutral-400"
          >
            {{ previewItems.length }} photos
          </span>
        </div>
      </div>

      <div
        v-if="moduleVisible('gallery')"
        class="p-3"
        :class="
          surfaceStyle === 'soft'
            ? 'bg-white/55 dark:bg-black/20'
            : 'bg-neutral-50 dark:bg-neutral-900/40'
        "
        :style="{ order: moduleOrder('gallery') }"
      >
        <div
          class="mx-auto"
          :class="previewWidthClass"
          :style="
            layout === 'masonry'
              ? { columnCount: previewColumns, columnGap: previewGap }
              : layout === 'grid'
                ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${previewColumns}, minmax(0, 1fr))`,
                    gap: previewGap,
                  }
                : { display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }
          "
        >
          <div
            v-for="item in previewItems"
            :key="item.id"
            class="overflow-hidden"
            :class="layout === 'masonry' ? 'mb-1.5 break-inside-avoid' : ''"
          >
            <div
              class="relative overflow-hidden"
              :style="{
                aspectRatio: itemRatio(item.naturalRatio),
                backgroundColor: item.color,
                borderRadius: `${cornerRadius}px`,
              }"
            >
              <img
                v-if="item.src"
                :src="item.src"
                :alt="item.title"
                class="absolute inset-0 size-full object-cover"
              />
              <Icon
                v-else
                name="lucide:image"
                class="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-neutral-500/50"
              />
            </div>
            <div
              v-if="layout === 'feed'"
              class="flex items-center justify-between border-b border-neutral-200 py-1.5 text-[8px] dark:border-neutral-800"
            >
              <span class="font-medium">{{ item.title }}</span>
              <span class="text-neutral-400">2026 · Shanghai</span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="moduleVisible('footer') && (footerText || socialLinks.length)"
        class="flex items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2 text-[8px] text-neutral-500 dark:border-neutral-800"
        :style="{ order: moduleOrder('footer') }"
      >
        <span class="truncate">{{ footerText }}</span>
        <span
          v-if="socialLinks.length"
          class="shrink-0"
        >
          {{ socialLinks.length }} links
        </span>
      </div>
    </div>
  </aside>
</template>
