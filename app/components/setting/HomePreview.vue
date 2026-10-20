<script setup lang="ts">
interface Props {
  settings: Record<string, unknown>
  title?: string
  author?: string
  slogan?: string
  description?: string
  avatarUrl?: string
  photos?: Photo[]
  viewport?: 'desktop' | 'mobile'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'LumaAtlas',
  author: '',
  slogan: '',
  description: '',
  avatarUrl: '',
  photos: () => [],
  viewport: 'desktop',
})

const setting = (key: string, fallback: unknown) =>
  props.settings[key] ?? fallback

const layout = computed(() => {
  const value = String(setting('appearance.home.layout', 'masonry'))
  return value === 'feed' ? 'big' : value
})
const imageRatio = computed(() =>
  String(setting('appearance.home.imageRatio', 'natural')),
)
const contentWidth = computed(() =>
  String(setting('appearance.home.contentWidth', 'wide')),
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
const headingFont = computed(() => {
  const value = setting('appearance.home.headingFont', 'wenkai')
  if (value === 'serif') {
    return 'Georgia, Cambria, "Times New Roman", serif'
  }
  if (value === 'wenkai') {
    return 'var(--font-display)'
  }
  return 'var(--font-sans)'
})
const surfaceStyle = computed(() =>
  String(setting('appearance.home.surfaceStyle', 'clean')),
)
const showSlogan = computed(
  () => setting('appearance.home.showSlogan', true) !== false,
)
const showAuthorIntro = computed(
  () => setting('appearance.home.showAuthorIntro', true) !== false,
)
const showStats = computed(
  () => setting('appearance.home.showStats', true) !== false,
)
const showPhotoInfo = computed(
  () => setting('appearance.home.showPhotoInfo', false) === true,
)
const showBigPhotoInfo = computed(
  () => setting('appearance.home.showBigPhotoInfo', true) !== false,
)
const showGlobeNav = computed(
  () => setting('appearance.home.showGlobeNav', true) !== false,
)
const showAlbumsNav = computed(
  () => setting('appearance.home.showAlbumsNav', true) !== false,
)
const showAboutNav = computed(
  () => setting('appearance.home.showAboutNav', false) === true,
)

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const moduleSettings = computed(() => {
  const value = asRecord(setting('appearance.home.modules', {}))
  const allowed = ['header', 'author', 'gallery', 'footer']
  const source = Array.isArray(value.order) ? value.order : []
  const order = [...new Set([...source, ...allowed])].filter(
    (item): item is string =>
      typeof item === 'string' && allowed.includes(item),
  )
  if (!source.includes('author')) {
    order.splice(order.indexOf('author'), 1)
    order.splice(Math.max(0, order.indexOf('header') + 1), 0, 'author')
  }
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
  const navigation = asRecord(setting('appearance.home.navigation', {}))
  const allowed = ['globe', 'albums', 'about']
  const requested = Array.isArray(navigation.order) ? navigation.order : []
  const order = [...new Set([...requested, ...allowed])].filter(
    (item): item is string =>
      typeof item === 'string' && allowed.includes(item),
  )
  const labels: Record<string, string> = {
    globe: 'Map',
    albums: 'Albums',
    about: 'About',
  }
  const visible: Record<string, boolean> = {
    globe: showGlobeNav.value,
    albums: showAlbumsNav.value,
    about: showAboutNav.value,
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
  const count = layout.value === 'big' ? 2 : 8
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
  if (layout.value !== 'grid') return naturalRatio
  if (imageRatio.value === 'square') return 1
  if (imageRatio.value === 'landscape') return 4 / 3
  return 1
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
        '--preview-brand-font': 'var(--font-brand)',
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
            <span
              class="truncate text-sm font-semibold"
              :style="{ fontFamily: 'var(--preview-brand-font)' }"
              >{{ title }}</span
            >
          </div>
          <div class="flex items-center gap-2 text-[8px] text-neutral-500">
            <span>Home</span>
            <span
              v-for="item in navigationItems"
              :key="item.id"
              >{{ item.label }}</span
            >
          </div>
        </div>
      </div>

      <div
        v-if="moduleVisible('author') && (showAuthorIntro || showStats)"
        class="flex items-end justify-between gap-3 border-b border-neutral-200 px-3 py-3 dark:border-neutral-800"
        :style="{ order: moduleOrder('author') }"
      >
        <div
          v-if="showAuthorIntro"
          class="flex min-w-0 items-center gap-2"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="author || title"
            class="size-7 shrink-0 rounded-full object-cover"
          />
          <span
            v-else
            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900"
          >
            <Icon
              name="lucide:user-round"
              class="size-3 text-neutral-500"
            />
          </span>
          <div class="min-w-0">
            <p
              class="truncate text-[10px] font-medium"
              :style="{ fontFamily: headingFont }"
            >
              {{ author || title }}
            </p>
            <p
              v-if="showSlogan && (slogan || description)"
              class="mt-0.5 line-clamp-2 text-[8px] leading-3 text-neutral-500"
            >
              {{ slogan || description }}
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
            class="group overflow-hidden"
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
              <div
                v-if="showPhotoInfo && layout !== 'big' && item.title"
                class="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {{ item.title }}
              </div>
            </div>
            <div
              v-if="layout === 'big' && showBigPhotoInfo"
              class="flex items-center gap-2 overflow-hidden border-b border-neutral-200 py-1.5 text-[8px] dark:border-neutral-800"
            >
              <span class="inline-flex shrink-0 items-center gap-0.5">
                <Icon
                  name="lucide:telescope"
                  class="size-2.5"
                />35 mm
              </span>
              <span class="inline-flex shrink-0 items-center gap-0.5">
                <Icon
                  name="lucide:aperture"
                  class="size-2.5"
                />ƒ/2.8
              </span>
              <span class="inline-flex shrink-0 items-center gap-0.5">
                <Icon
                  name="lucide:timer"
                  class="size-2.5"
                />1/250s
              </span>
              <span
                class="ml-auto truncate border-l border-neutral-200 pl-2 text-neutral-400 dark:border-neutral-800"
                >Shanghai</span
              >
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
