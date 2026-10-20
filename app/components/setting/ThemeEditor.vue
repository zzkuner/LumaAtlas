<script setup lang="ts">
interface Props {
  settings: Record<string, unknown>
  title?: string
  author?: string
  slogan?: string
  description?: string
  avatarUrl?: string
  photos?: Photo[]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'LumaAtlas',
  author: '',
  slogan: '',
  description: '',
  avatarUrl: '',
  photos: () => [],
})

const emit = defineEmits<{
  change: [key: string, value: unknown]
}>()

const viewport = ref<'desktop' | 'mobile'>('desktop')
const setViewport = (value: 'desktop' | 'mobile') => {
  viewport.value = value
}
const setting = (key: string, fallback: unknown) =>
  props.settings[key] ?? fallback
const update = (key: string, value: unknown) => emit('change', key, value)

const socialLinks = computed(() => {
  const value = setting('appearance.home.socialLinks', {})
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
})

const updateSocial = (key: string, value: string) => {
  update('appearance.home.socialLinks', {
    ...socialLinks.value,
    [key]: value,
  })
}

const sourceOptions = [
  { value: 'all', label: '全部', icon: 'lucide:images' },
  { value: 'featured', label: '精选', icon: 'lucide:sparkles' },
  { value: 'recent', label: '最新', icon: 'lucide:clock-3' },
  { value: 'random', label: '随览', icon: 'lucide:dices' },
  { value: 'nearby', label: '附近', icon: 'lucide:navigation' },
  { value: 'faraway', label: '远方', icon: 'lucide:plane' },
]

const layoutOptions = [
  { value: 'big', label: '大图', icon: 'lucide:gallery-vertical-end' },
  { value: 'masonry', label: '瀑布流', icon: 'lucide:panels-top-left' },
  { value: 'grid', label: '方格', icon: 'lucide:grid-2x2' },
]

const isLayoutSelected = (value: string) => {
  const current = String(setting('appearance.home.layout', 'masonry'))
  return value === 'big'
    ? current === 'big' || current === 'feed'
    : current === value
}

const gridImageRatio = computed(() => {
  const value = String(setting('appearance.home.imageRatio', 'square'))
  return value === 'landscape' ? 'landscape' : 'square'
})

type PublicPageId = 'globe' | 'albums' | 'about'
type HomeModuleId = 'header' | 'author' | 'gallery' | 'footer'

const normalizeOrder = <T extends string>(
  value: unknown,
  allowed: readonly T[],
) => {
  const requested = Array.isArray(value) ? value : []
  return [...new Set([...requested, ...allowed])].filter(
    (item): item is T =>
      typeof item === 'string' && allowed.includes(item as T),
  )
}

const moveItem = <T>(items: T[], index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

const publicPageMeta: Record<
  PublicPageId,
  { label: string; icon: string; settingKey: string }
> = {
  globe: {
    label: '地图',
    icon: 'lucide:map',
    settingKey: 'appearance.home.showGlobeNav',
  },
  albums: {
    label: '相册',
    icon: 'lucide:images',
    settingKey: 'appearance.home.showAlbumsNav',
  },
  about: {
    label: '关于',
    icon: 'lucide:user-round',
    settingKey: 'appearance.home.showAboutNav',
  },
}
const publicPageIds = Object.keys(publicPageMeta) as PublicPageId[]
const navigationSettings = computed(() => {
  const value = setting('appearance.home.navigation', {})
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
})
const orderedPublicPages = computed(() =>
  normalizeOrder<PublicPageId>(navigationSettings.value.order, publicPageIds),
)
const isPublicPageEnabled = (id: PublicPageId) => {
  const value = setting(
    publicPageMeta[id].settingKey,
    id === 'about' ? false : true,
  )
  return id === 'about' ? value === true : value !== false
}
const updateNavigationOrder = (order: PublicPageId[]) => {
  update('appearance.home.navigation', {
    ...navigationSettings.value,
    order,
  })
}
const movePublicPage = (index: number, direction: -1 | 1) => {
  updateNavigationOrder(moveItem(orderedPublicPages.value, index, direction))
}

const homeModuleMeta: Record<
  HomeModuleId,
  { label: string; description: string; icon: string }
> = {
  header: {
    label: '顶部导航',
    description: '站点标识、页面入口和浏览工具',
    icon: 'lucide:panel-top',
  },
  author: {
    label: '作者信息',
    description: '作者简介、站点标语和照片统计',
    icon: 'lucide:user-round',
  },
  gallery: {
    label: '照片内容',
    description: '首页的大图、瀑布流或方格',
    icon: 'lucide:images',
  },
  footer: {
    label: '页脚信息',
    description: '页脚文案和外部链接',
    icon: 'lucide:panel-bottom',
  },
}
const homeModuleIds = Object.keys(homeModuleMeta) as HomeModuleId[]
const homeModuleSettings = computed(() => {
  const value = setting('appearance.home.modules', {})
  const config =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const hidden = Array.isArray(config.hidden)
    ? config.hidden.filter(
        (item): item is HomeModuleId =>
          typeof item === 'string' &&
          homeModuleIds.includes(item as HomeModuleId),
      )
    : []
  const order = normalizeOrder<HomeModuleId>(config.order, homeModuleIds)
  if (!Array.isArray(config.order) || !config.order.includes('author')) {
    order.splice(order.indexOf('author'), 1)
    order.splice(Math.max(0, order.indexOf('header') + 1), 0, 'author')
  }
  return {
    ...config,
    order,
    hidden,
  }
})
const orderedHomeModules = computed(() => homeModuleSettings.value.order)
const updateHomeModules = (next: {
  order?: HomeModuleId[]
  hidden?: HomeModuleId[]
}) => {
  update('appearance.home.modules', {
    ...homeModuleSettings.value,
    ...next,
  })
}
const moveHomeModule = (index: number, direction: -1 | 1) => {
  updateHomeModules({
    order: moveItem(orderedHomeModules.value, index, direction),
  })
}
const toggleHomeModule = (id: HomeModuleId, visible: boolean) => {
  const hidden = new Set(homeModuleSettings.value.hidden)
  if (visible) hidden.delete(id)
  else hidden.add(id)
  updateHomeModules({ hidden: [...hidden] })
}
</script>

<template>
  <div class="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
    <div class="min-w-0 divide-y divide-neutral-200 dark:divide-neutral-800">
      <section class="pb-8">
        <h5 class="text-sm font-semibold">首页默认内容</h5>
        <p class="mt-1 text-sm text-neutral-500">
          访客仍可在首页临时切换，这里决定首次打开时看到的内容。
        </p>
        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <UButton
            v-for="option in sourceOptions"
            :key="option.value"
            :icon="option.icon"
            :label="option.label"
            color="neutral"
            :variant="
              setting('appearance.home.source', 'all') === option.value
                ? 'solid'
                : 'outline'
            "
            block
            @click="update('appearance.home.source', option.value)"
          />
        </div>
      </section>

      <section class="py-8">
        <h5 class="text-sm font-semibold">导航与页面</h5>
        <p class="mt-1 text-sm text-neutral-500">
          首页始终显示，地图、相册和关于页面可单独开关。
        </p>
        <div
          class="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
        >
          <div
            v-for="(id, index) in orderedPublicPages"
            :key="id"
            class="flex min-h-14 items-center gap-3 py-2"
          >
            <Icon
              :name="publicPageMeta[id].icon"
              class="size-4 text-neutral-500"
            />
            <span class="flex-1 text-sm font-medium">
              {{ publicPageMeta[id].label }}
            </span>
            <div class="flex items-center gap-0.5">
              <UButton
                icon="lucide:chevron-up"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="index === 0"
                :aria-label="`上移${publicPageMeta[id].label}`"
                @click="movePublicPage(index, -1)"
              />
              <UButton
                icon="lucide:chevron-down"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="index === orderedPublicPages.length - 1"
                :aria-label="`下移${publicPageMeta[id].label}`"
                @click="movePublicPage(index, 1)"
              />
            </div>
            <USwitch
              :model-value="isPublicPageEnabled(id)"
              :aria-label="`显示${publicPageMeta[id].label}页面`"
              @update:model-value="
                update(publicPageMeta[id].settingKey, $event)
              "
            />
          </div>
        </div>
      </section>

      <section class="py-8">
        <h5 class="text-sm font-semibold">首页结构</h5>
        <p class="mt-1 text-sm text-neutral-500">
          调整首页模块顺序；关闭模块后，相关内容不会出现在公开首页。
        </p>
        <div
          class="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
        >
          <div
            v-for="(id, index) in orderedHomeModules"
            :key="id"
            class="flex min-h-16 items-center gap-3 py-2"
          >
            <Icon
              :name="homeModuleMeta[id].icon"
              class="size-4 text-neutral-500"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ homeModuleMeta[id].label }}</p>
              <p class="truncate text-xs text-neutral-500">
                {{ homeModuleMeta[id].description }}
              </p>
            </div>
            <div class="flex items-center gap-0.5">
              <UButton
                icon="lucide:chevron-up"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="index === 0"
                :aria-label="`上移${homeModuleMeta[id].label}`"
                @click="moveHomeModule(index, -1)"
              />
              <UButton
                icon="lucide:chevron-down"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="index === orderedHomeModules.length - 1"
                :aria-label="`下移${homeModuleMeta[id].label}`"
                @click="moveHomeModule(index, 1)"
              />
            </div>
            <USwitch
              :model-value="!homeModuleSettings.hidden.includes(id)"
              :aria-label="`显示${homeModuleMeta[id].label}`"
              @update:model-value="toggleHomeModule(id, $event)"
            />
          </div>
        </div>
      </section>

      <section class="py-8">
        <h5 class="text-sm font-semibold">照片布局</h5>
        <p class="mt-1 text-sm text-neutral-500">
          这里设置首次访问的默认值；访客可在首页按当前浏览器覆盖布局和列数。
        </p>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <UButton
            v-for="option in layoutOptions"
            :key="option.value"
            :icon="option.icon"
            :label="option.label"
            color="neutral"
            :variant="isLayoutSelected(option.value) ? 'solid' : 'outline'"
            block
            @click="update('appearance.home.layout', option.value)"
          />
        </div>

        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <label class="block">
            <span class="mb-2 block text-xs font-medium text-neutral-500"
              >内容宽度</span
            >
            <select
              class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              :value="setting('appearance.home.contentWidth', 'wide')"
              @change="
                update(
                  'appearance.home.contentWidth',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="contained">收窄</option>
              <option value="wide">宽屏</option>
              <option value="full">全宽</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-2 block text-xs font-medium text-neutral-500"
              >方格图片比例</span
            >
            <select
              class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              :value="gridImageRatio"
              @change="
                update(
                  'appearance.home.imageRatio',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="square">正方形</option>
              <option value="landscape">横向 4:3</option>
            </select>
          </label>
          <label class="block">
            <span
              class="mb-2 flex justify-between text-xs font-medium text-neutral-500"
            >
              <span>方格最大列数</span>
              <span
                >{{ Number(setting('appearance.home.maxColumns', 6)) }} 列</span
              >
            </span>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              class="w-full accent-neutral-950 dark:accent-white"
              :value="Number(setting('appearance.home.maxColumns', 6))"
              @input="
                update(
                  'appearance.home.maxColumns',
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </label>
          <label class="block">
            <span
              class="mb-2 flex justify-between text-xs font-medium text-neutral-500"
            >
              <span>图片间距</span>
              <span
                >{{
                  Number(setting('appearance.home.galleryGap', 12))
                }}
                px</span
              >
            </span>
            <input
              type="range"
              min="4"
              max="24"
              step="1"
              class="w-full accent-neutral-950 dark:accent-white"
              :value="Number(setting('appearance.home.galleryGap', 12))"
              @input="
                update(
                  'appearance.home.galleryGap',
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </label>
        </div>
      </section>

      <section class="py-8">
        <h5 class="text-sm font-semibold">首页信息</h5>
        <p class="mt-1 text-sm text-neutral-500">
          控制作者简介、统计文字，以及不同布局中的照片说明。
        </p>
        <div class="mt-4 grid gap-x-6 sm:grid-cols-2">
          <label
            class="flex items-center justify-between border-y border-neutral-200 py-3 text-sm dark:border-neutral-800"
          >
            <span>作者信息</span>
            <USwitch
              :model-value="
                setting('appearance.home.showAuthorIntro', true) !== false
              "
              @update:model-value="
                update('appearance.home.showAuthorIntro', $event)
              "
            />
          </label>
          <label
            class="flex items-center justify-between border-y border-neutral-200 py-3 text-sm dark:border-neutral-800"
          >
            <span>站点标语</span>
            <USwitch
              :model-value="
                setting('appearance.home.showSlogan', true) !== false
              "
              @update:model-value="update('appearance.home.showSlogan', $event)"
            />
          </label>
          <label
            class="flex items-center justify-between border-b border-neutral-200 py-3 text-sm dark:border-neutral-800"
          >
            <span>照片统计</span>
            <USwitch
              :model-value="
                setting('appearance.home.showStats', true) !== false
              "
              @update:model-value="update('appearance.home.showStats', $event)"
            />
          </label>
          <label
            class="flex items-center justify-between border-b border-neutral-200 py-3 text-sm dark:border-neutral-800"
          >
            <span>缩略图悬浮信息</span>
            <USwitch
              :model-value="
                setting('appearance.home.showPhotoInfo', false) === true
              "
              @update:model-value="
                update('appearance.home.showPhotoInfo', $event)
              "
            />
          </label>
          <label
            class="flex items-center justify-between border-b border-neutral-200 py-3 text-sm dark:border-neutral-800"
          >
            <span>大图下方拍摄参数</span>
            <USwitch
              :model-value="
                setting('appearance.home.showBigPhotoInfo', true) !== false
              "
              @update:model-value="
                update('appearance.home.showBigPhotoInfo', $event)
              "
            />
          </label>
        </div>
      </section>

      <section class="py-8">
        <h5 class="text-sm font-semibold">字体与颜色</h5>
        <div class="mt-4 grid gap-5 sm:grid-cols-2">
          <label class="block">
            <span class="mb-2 block text-xs font-medium text-neutral-500"
              >前台字体</span
            >
            <select
              class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              :value="setting('appearance.home.headingFont', 'wenkai')"
              @change="
                update(
                  'appearance.home.headingFont',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="wenkai">霞鹜文楷</option>
              <option value="serif">编辑衬线</option>
              <option value="sans">现代无衬线</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-2 block text-xs font-medium text-neutral-500"
              >页面质感</span
            >
            <select
              class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              :value="setting('appearance.home.surfaceStyle', 'clean')"
              @change="
                update(
                  'appearance.home.surfaceStyle',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="clean">纯净</option>
              <option value="soft">柔和</option>
              <option value="contrast">高对比</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-2 block text-xs font-medium text-neutral-500"
              >强调色</span
            >
            <span class="flex items-center gap-2">
              <input
                type="color"
                class="size-9 cursor-pointer border-0 bg-transparent p-0"
                :value="
                  String(setting('appearance.home.accentColor', '#171717'))
                "
                @input="
                  update(
                    'appearance.home.accentColor',
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
              <UInput
                class="flex-1"
                :model-value="
                  String(setting('appearance.home.accentColor', '#171717'))
                "
                @update:model-value="
                  update('appearance.home.accentColor', String($event))
                "
              />
            </span>
          </label>
          <label class="block">
            <span
              class="mb-2 flex justify-between text-xs font-medium text-neutral-500"
            >
              <span>图片圆角</span>
              <span
                >{{
                  Number(setting('appearance.home.cornerRadius', 2))
                }}
                px</span
              >
            </span>
            <input
              type="range"
              min="0"
              max="16"
              class="w-full accent-neutral-950 dark:accent-white"
              :value="Number(setting('appearance.home.cornerRadius', 2))"
              @input="
                update(
                  'appearance.home.cornerRadius',
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </label>
        </div>
      </section>

      <section class="pt-8">
        <h5 class="text-sm font-semibold">页脚与外部链接</h5>
        <p class="mt-1 text-sm text-neutral-500">留空的项目不会出现在前台。</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <UFormField label="个人网站">
            <UInput
              type="url"
              icon="lucide:link"
              :model-value="String(socialLinks.website || '')"
              @update:model-value="updateSocial('website', String($event))"
            />
          </UFormField>
          <UFormField label="Instagram">
            <UInput
              type="url"
              icon="simple-icons:instagram"
              :model-value="String(socialLinks.instagram || '')"
              @update:model-value="updateSocial('instagram', String($event))"
            />
          </UFormField>
          <UFormField label="X">
            <UInput
              type="url"
              icon="simple-icons:x"
              :model-value="String(socialLinks.x || '')"
              @update:model-value="updateSocial('x', String($event))"
            />
          </UFormField>
          <UFormField label="GitHub">
            <UInput
              type="url"
              icon="simple-icons:github"
              :model-value="String(socialLinks.github || '')"
              @update:model-value="updateSocial('github', String($event))"
            />
          </UFormField>
        </div>
        <UFormField
          label="页脚文案"
          class="mt-4"
        >
          <UTextarea
            :rows="2"
            :model-value="String(setting('appearance.home.footerText', ''))"
            @update:model-value="
              update('appearance.home.footerText', String($event))
            "
          />
        </UFormField>
      </section>
    </div>

    <aside class="xl:sticky xl:top-6">
      <div class="mb-3 flex items-center justify-end gap-1">
        <UButton
          icon="lucide:monitor"
          label="桌面"
          size="xs"
          color="neutral"
          :variant="viewport === 'desktop' ? 'solid' : 'ghost'"
          @click="setViewport('desktop')"
        />
        <UButton
          icon="lucide:smartphone"
          label="手机"
          size="xs"
          color="neutral"
          :variant="viewport === 'mobile' ? 'solid' : 'ghost'"
          @click="setViewport('mobile')"
        />
      </div>
      <SettingHomePreview
        :settings="settings"
        :title="title"
        :author="author"
        :slogan="slogan"
        :description="description"
        :avatar-url="avatarUrl"
        :photos="photos"
        :viewport="viewport"
      />
    </aside>
  </div>
</template>
