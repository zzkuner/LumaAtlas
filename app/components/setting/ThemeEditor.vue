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
  { value: 'big', label: '大图', icon: 'lucide:rectangle-vertical' },
  { value: 'masonry', label: '瀑布流', icon: 'lucide:layout-dashboard' },
  { value: 'grid', label: '方格', icon: 'lucide:grid-3x3' },
]

const isLayoutSelected = (value: string) => {
  const current = String(setting('appearance.home.layout', 'masonry'))
  return value === 'big'
    ? current === 'big' || current === 'feed'
    : current === value
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
          <label class="flex min-h-14 items-center gap-3 py-2">
            <Icon
              name="lucide:map"
              class="size-4 text-neutral-500"
            />
            <span class="flex-1 text-sm font-medium">地图</span>
            <USwitch
              :model-value="
                setting('appearance.home.showGlobeNav', true) !== false
              "
              @update:model-value="
                update('appearance.home.showGlobeNav', $event)
              "
            />
          </label>
          <label class="flex min-h-14 items-center gap-3 py-2">
            <Icon
              name="lucide:images"
              class="size-4 text-neutral-500"
            />
            <span class="flex-1 text-sm font-medium">相册</span>
            <USwitch
              :model-value="
                setting('appearance.home.showAlbumsNav', true) !== false
              "
              @update:model-value="
                update('appearance.home.showAlbumsNav', $event)
              "
            />
          </label>
          <label class="flex min-h-14 items-center gap-3 py-2">
            <Icon
              name="lucide:user-round"
              class="size-4 text-neutral-500"
            />
            <span class="flex-1 text-sm font-medium">关于</span>
            <USwitch
              :model-value="
                setting('appearance.home.showAboutNav', false) === true
              "
              @update:model-value="
                update('appearance.home.showAboutNav', $event)
              "
            />
          </label>
        </div>
      </section>

      <section class="py-8">
        <h5 class="text-sm font-semibold">照片布局</h5>
        <p class="mt-1 text-sm text-neutral-500">
          大图为纵向浏览；方格列数和图片间距会同步到公开首页。
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
              >缩略图比例</span
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
          控制作者简介、统计文字和照片上的说明信息。
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
            <span>照片标注与拍摄参数</span>
            <USwitch
              :model-value="
                setting('appearance.home.showPhotoInfo', false) === true
              "
              @update:model-value="
                update('appearance.home.showPhotoInfo', $event)
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
        :slogan="slogan"
        :description="description"
        :avatar-url="avatarUrl"
        :photos="photos"
        :viewport="viewport"
      />
    </aside>
  </div>
</template>
