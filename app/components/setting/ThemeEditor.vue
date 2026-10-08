<script setup lang="ts">
interface Props {
  settings: Record<string, unknown>
  title?: string
  slogan?: string
  description?: string
  avatarUrl?: string
  photos?: Photo[]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'LumaAtlas',
  slogan: '',
  description: '',
  avatarUrl: '',
  photos: () => [],
})

const emit = defineEmits<{
  change: [key: string, value: unknown]
}>()

type ModuleId = 'header' | 'gallery' | 'footer'
type NavigationId = 'explore' | 'globe' | 'albums'

const viewport = ref<'desktop' | 'mobile'>('desktop')
const setViewport = (value: 'desktop' | 'mobile') => {
  viewport.value = value
}

const setting = (key: string, fallback: unknown) =>
  props.settings[key] ?? fallback

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const validOrder = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] => {
  const source = Array.isArray(value) ? value : []
  const selected = source.filter(
    (item): item is T =>
      typeof item === 'string' && allowed.includes(item as T),
  )
  return [...new Set([...selected, ...allowed])]
}

const modules = computed(() => {
  const value = asRecord(
    setting('appearance.home.modules', {
      order: ['header', 'gallery', 'footer'],
      hidden: [],
    }),
  )
  return {
    order: validOrder<ModuleId>(value.order, ['header', 'gallery', 'footer']),
    hidden: Array.isArray(value.hidden)
      ? value.hidden.filter(
          (item): item is ModuleId =>
            typeof item === 'string' &&
            ['header', 'gallery', 'footer'].includes(item),
        )
      : [],
  }
})

const navigation = computed(() => {
  const value = asRecord(
    setting('appearance.home.navigation', {
      order: ['explore', 'globe', 'albums'],
    }),
  )
  return {
    order: validOrder<NavigationId>(value.order, [
      'explore',
      'globe',
      'albums',
    ]),
  }
})

const socialLinks = computed(() =>
  asRecord(
    setting('appearance.home.socialLinks', {
      website: '',
      instagram: '',
      x: '',
      github: '',
    }),
  ),
)

const presetOptions = [
  {
    value: 'camlife',
    label: 'Camlife',
    description: '轻盈留白、自然比例与紧凑瀑布流。',
    icon: 'lucide:gallery-vertical-end',
  },
  {
    value: 'minimal',
    label: '极简',
    description: '规整网格、克制信息与中性视觉。',
    icon: 'lucide:grid-3x3',
  },
  {
    value: 'editorial',
    label: '杂志',
    description: '宽松单列、衬线标题与完整介绍。',
    icon: 'lucide:newspaper',
  },
] as const

const presets: Record<string, Record<string, unknown>> = {
  camlife: {
    'appearance.home.style': 'minimal',
    'appearance.home.layout': 'masonry',
    'appearance.home.imageRatio': 'natural',
    'appearance.home.contentWidth': 'wide',
    'appearance.home.density': 'compact',
    'appearance.home.galleryGap': 8,
    'appearance.home.maxColumns': 6,
    'appearance.home.showSlogan': true,
    'appearance.home.showStats': true,
    'appearance.home.accentColor': '#171717',
    'appearance.home.surfaceStyle': 'clean',
    'appearance.home.cornerRadius': 2,
    'appearance.home.headingFont': 'sans',
  },
  minimal: {
    'appearance.home.style': 'minimal',
    'appearance.home.layout': 'grid',
    'appearance.home.imageRatio': 'square',
    'appearance.home.contentWidth': 'wide',
    'appearance.home.density': 'comfortable',
    'appearance.home.galleryGap': 12,
    'appearance.home.maxColumns': 5,
    'appearance.home.showSlogan': false,
    'appearance.home.showStats': true,
    'appearance.home.accentColor': '#171717',
    'appearance.home.surfaceStyle': 'soft',
    'appearance.home.cornerRadius': 0,
    'appearance.home.headingFont': 'sans',
  },
  editorial: {
    'appearance.home.style': 'editorial',
    'appearance.home.layout': 'feed',
    'appearance.home.imageRatio': 'landscape',
    'appearance.home.contentWidth': 'contained',
    'appearance.home.density': 'airy',
    'appearance.home.galleryGap': 20,
    'appearance.home.maxColumns': 3,
    'appearance.home.showSlogan': true,
    'appearance.home.showStats': true,
    'appearance.home.accentColor': '#9f3f33',
    'appearance.home.surfaceStyle': 'clean',
    'appearance.home.cornerRadius': 4,
    'appearance.home.headingFont': 'serif',
  },
}

const update = (key: string, value: unknown, markCustom = true) => {
  emit('change', key, value)
  if (
    markCustom &&
    key !== 'appearance.home.preset' &&
    setting('appearance.home.preset', 'camlife') !== 'custom'
  ) {
    emit('change', 'appearance.home.preset', 'custom')
  }
}

const applyPreset = (preset: string) => {
  for (const [key, value] of Object.entries(presets[preset] || {})) {
    emit('change', key, value)
  }
  emit('change', 'appearance.home.preset', preset)
}

const moveItem = (
  type: 'modules' | 'navigation',
  id: string,
  direction: -1 | 1,
) => {
  const current: string[] =
    type === 'modules' ? [...modules.value.order] : [...navigation.value.order]
  const index = current.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= current.length) return
  const currentItem = current[index]
  const targetItem = current[target]
  if (!currentItem || !targetItem) return
  current[index] = targetItem
  current[target] = currentItem

  if (type === 'modules') {
    update('appearance.home.modules', {
      ...modules.value,
      order: current,
    })
  } else {
    update('appearance.home.navigation', { order: current })
  }
}

const toggleModule = (id: ModuleId, visible: boolean) => {
  const hidden = new Set(modules.value.hidden)
  if (visible) hidden.delete(id)
  else hidden.add(id)
  update('appearance.home.modules', {
    order: modules.value.order,
    hidden: [...hidden],
  })
}

const navVisibilityKey: Record<NavigationId, string> = {
  explore: 'appearance.home.showExploreNav',
  globe: 'appearance.home.showGlobeNav',
  albums: 'appearance.home.showAlbumsNav',
}

const moduleLabels: Record<ModuleId, { label: string; icon: string }> = {
  header: { label: '站点介绍', icon: 'lucide:panel-top' },
  gallery: { label: '图片画廊', icon: 'lucide:images' },
  footer: { label: '页脚与社交链接', icon: 'lucide:panel-bottom' },
}

const navigationLabels: Record<NavigationId, { label: string; icon: string }> =
  {
    explore: { label: '探索', icon: 'lucide:compass' },
    globe: { label: '地球', icon: 'lucide:globe-2' },
    albums: { label: '相册', icon: 'lucide:folder-heart' },
  }

const updateSocial = (key: string, value: string) => {
  update('appearance.home.socialLinks', {
    ...socialLinks.value,
    [key]: value,
  })
}
</script>

<template>
  <div class="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
    <div class="min-w-0 space-y-8">
      <section>
        <div class="mb-4">
          <h5 class="text-sm font-semibold text-neutral-950 dark:text-white">
            快速预设
          </h5>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            选择一个起点，再继续调整每个细节。
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <button
            v-for="preset in presetOptions"
            :key="preset.value"
            type="button"
            class="min-h-32 rounded-md border p-4 text-left transition-colors"
            :class="
              setting('appearance.home.preset', 'camlife') === preset.value
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600'
            "
            @click="applyPreset(preset.value)"
          >
            <Icon
              :name="preset.icon"
              class="size-5"
            />
            <p class="mt-5 text-sm font-semibold">{{ preset.label }}</p>
            <p
              class="mt-1 text-xs leading-5"
              :class="
                setting('appearance.home.preset', 'camlife') === preset.value
                  ? 'text-neutral-300 dark:text-neutral-600'
                  : 'text-neutral-500'
              "
            >
              {{ preset.description }}
            </p>
          </button>
        </div>
      </section>

      <section class="border-t border-neutral-200 pt-7 dark:border-neutral-800">
        <div class="mb-4">
          <h5 class="text-sm font-semibold text-neutral-950 dark:text-white">
            页面模块
          </h5>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            控制首页区域的显示状态和从上到下的顺序。
          </p>
        </div>
        <div
          class="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
        >
          <div
            v-for="(id, index) in modules.order"
            :key="id"
            class="flex min-h-14 items-center gap-3 py-2"
          >
            <Icon
              :name="moduleLabels[id].icon"
              class="size-4 text-neutral-500"
            />
            <span class="min-w-0 flex-1 text-sm font-medium">{{
              moduleLabels[id].label
            }}</span>
            <USwitch
              :model-value="!modules.hidden.includes(id)"
              :aria-label="`显示${moduleLabels[id].label}`"
              @update:model-value="toggleModule(id, $event)"
            />
            <div class="flex items-center">
              <UButton
                icon="lucide:arrow-up"
                variant="ghost"
                color="neutral"
                size="xs"
                :disabled="index === 0"
                :aria-label="`上移${moduleLabels[id].label}`"
                @click="moveItem('modules', id, -1)"
              />
              <UButton
                icon="lucide:arrow-down"
                variant="ghost"
                color="neutral"
                size="xs"
                :disabled="index === modules.order.length - 1"
                :aria-label="`下移${moduleLabels[id].label}`"
                @click="moveItem('modules', id, 1)"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-neutral-200 pt-7 dark:border-neutral-800">
        <div class="mb-4">
          <h5 class="text-sm font-semibold text-neutral-950 dark:text-white">
            导航
          </h5>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            图库始终作为首页入口，其余入口可排序或隐藏。
          </p>
        </div>
        <div
          class="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
        >
          <div
            v-for="(id, index) in navigation.order"
            :key="id"
            class="flex min-h-14 items-center gap-3 py-2"
          >
            <Icon
              :name="navigationLabels[id].icon"
              class="size-4 text-neutral-500"
            />
            <span class="min-w-0 flex-1 text-sm font-medium">{{
              navigationLabels[id].label
            }}</span>
            <USwitch
              :model-value="setting(navVisibilityKey[id], true) !== false"
              :aria-label="`显示${navigationLabels[id].label}`"
              @update:model-value="update(navVisibilityKey[id], $event)"
            />
            <div class="flex items-center">
              <UButton
                icon="lucide:arrow-up"
                variant="ghost"
                color="neutral"
                size="xs"
                :disabled="index === 0"
                :aria-label="`上移${navigationLabels[id].label}`"
                @click="moveItem('navigation', id, -1)"
              />
              <UButton
                icon="lucide:arrow-down"
                variant="ghost"
                color="neutral"
                size="xs"
                :disabled="index === navigation.order.length - 1"
                :aria-label="`下移${navigationLabels[id].label}`"
                @click="moveItem('navigation', id, 1)"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-neutral-200 pt-7 dark:border-neutral-800">
        <div class="mb-5">
          <h5 class="text-sm font-semibold text-neutral-950 dark:text-white">
            画廊布局
          </h5>
        </div>
        <div class="space-y-5">
          <div>
            <p class="mb-2 text-xs font-medium text-neutral-500">布局方式</p>
            <div class="grid grid-cols-3 gap-2">
              <UButton
                v-for="option in [
                  {
                    value: 'masonry',
                    label: '瀑布流',
                    icon: 'lucide:layout-dashboard',
                  },
                  { value: 'grid', label: '网格', icon: 'lucide:grid-3x3' },
                  { value: 'feed', label: '单列', icon: 'lucide:rows-3' },
                ]"
                :key="option.value"
                :label="option.label"
                :icon="option.icon"
                :variant="
                  setting('appearance.home.layout', 'masonry') === option.value
                    ? 'solid'
                    : 'outline'
                "
                :color="
                  setting('appearance.home.layout', 'masonry') === option.value
                    ? 'neutral'
                    : 'neutral'
                "
                block
                @click="update('appearance.home.layout', option.value)"
              />
            </div>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <label class="block">
              <span class="mb-2 block text-xs font-medium text-neutral-500"
                >图片比例</span
              >
              <select
                class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                :value="setting('appearance.home.imageRatio', 'natural')"
                @change="
                  update(
                    'appearance.home.imageRatio',
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option value="natural">保持原比例</option>
                <option value="square">正方形</option>
                <option value="landscape">横向 4:3</option>
              </select>
            </label>
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
                >图片密度</span
              >
              <select
                class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                :value="setting('appearance.home.density', 'comfortable')"
                @change="
                  update(
                    'appearance.home.density',
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option value="compact">紧凑</option>
                <option value="comfortable">舒适</option>
                <option value="airy">宽松</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-2 block text-xs font-medium text-neutral-500"
                >图片来源</span
              >
              <select
                class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                :value="setting('appearance.home.source', 'all')"
                @change="
                  update(
                    'appearance.home.source',
                    ($event.target as HTMLSelectElement).value,
                  )
                "
              >
                <option value="all">全部公开图片</option>
                <option value="featured">仅精选图片</option>
              </select>
            </label>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
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
            <label class="block">
              <span
                class="mb-2 flex justify-between text-xs font-medium text-neutral-500"
              >
                <span>最大列数</span>
                <span
                  >{{
                    Number(setting('appearance.home.maxColumns', 6))
                  }}
                  列</span
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
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label
              class="flex items-center justify-between border-y border-neutral-200 py-3 text-sm dark:border-neutral-800"
            >
              <span>显示站点标语</span>
              <USwitch
                :model-value="
                  setting('appearance.home.showSlogan', true) !== false
                "
                @update:model-value="
                  update('appearance.home.showSlogan', $event)
                "
              />
            </label>
            <label
              class="flex items-center justify-between border-y border-neutral-200 py-3 text-sm dark:border-neutral-800"
            >
              <span>显示图片统计</span>
              <USwitch
                :model-value="
                  setting('appearance.home.showStats', true) !== false
                "
                @update:model-value="
                  update('appearance.home.showStats', $event)
                "
              />
            </label>
          </div>
        </div>
      </section>

      <section class="border-t border-neutral-200 pt-7 dark:border-neutral-800">
        <div class="mb-5">
          <h5 class="text-sm font-semibold text-neutral-950 dark:text-white">
            视觉细节
          </h5>
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
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
              step="1"
              class="mt-2 w-full accent-neutral-950 dark:accent-white"
              :value="Number(setting('appearance.home.cornerRadius', 2))"
              @input="
                update(
                  'appearance.home.cornerRadius',
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
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
              >标题字体</span
            >
            <select
              class="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              :value="setting('appearance.home.headingFont', 'sans')"
              @change="
                update(
                  'appearance.home.headingFont',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="sans">现代无衬线</option>
              <option value="serif">编辑衬线</option>
            </select>
          </label>
        </div>
      </section>

      <section class="border-t border-neutral-200 pt-7 dark:border-neutral-800">
        <div class="mb-5">
          <h5 class="text-sm font-semibold text-neutral-950 dark:text-white">
            页脚与社交链接
          </h5>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            留空的链接不会显示；页脚文案也可以完全留空。
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="个人网站">
            <UInput
              type="url"
              placeholder="https://"
              icon="lucide:link"
              :model-value="String(socialLinks.website || '')"
              @update:model-value="updateSocial('website', String($event))"
            />
          </UFormField>
          <UFormField label="Instagram">
            <UInput
              type="url"
              placeholder="https://"
              icon="simple-icons:instagram"
              :model-value="String(socialLinks.instagram || '')"
              @update:model-value="updateSocial('instagram', String($event))"
            />
          </UFormField>
          <UFormField label="X">
            <UInput
              type="url"
              placeholder="https://"
              icon="simple-icons:x"
              :model-value="String(socialLinks.x || '')"
              @update:model-value="updateSocial('x', String($event))"
            />
          </UFormField>
          <UFormField label="GitHub">
            <UInput
              type="url"
              placeholder="https://"
              icon="simple-icons:github"
              :model-value="String(socialLinks.github || '')"
              @update:model-value="updateSocial('github', String($event))"
            />
          </UFormField>
        </div>
        <UFormField
          label="自定义页脚文案"
          class="mt-4"
        >
          <UTextarea
            :rows="2"
            placeholder="留空则不显示文字"
            :model-value="String(setting('appearance.home.footerText', ''))"
            @update:model-value="
              update('appearance.home.footerText', String($event))
            "
          />
        </UFormField>
      </section>
    </div>

    <div class="xl:sticky xl:top-6">
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
        :slogan="slogan"
        :description="description"
        :avatar-url="avatarUrl"
        :photos="photos"
        :viewport="viewport"
      />
    </div>
  </div>
</template>
