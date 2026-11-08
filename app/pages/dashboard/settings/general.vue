<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('title.generalSettings'),
})

const colorMode = useColorMode()
const { photos } = usePhotos()

const { fields, state, submit, loading } = useSettingsForm('app')

const appFields = computed(() =>
  fields.value.filter((f) => !f.key.startsWith('appearance.')),
)

const contentAppearanceKeys = new Set([
  'appearance.home.socialLinks',
  'appearance.footer.enabled',
  'appearance.footer.text',
  'appearance.footer.showIcp',
  'appearance.footer.icpNumber',
])
const legacyAppearanceKeys = new Set(['appearance.home.footerText'])
const contentAppearanceFields = computed(() =>
  fields.value.filter((field) => contentAppearanceKeys.has(field.key)),
)

const identityFields = computed(() =>
  appFields.value.filter((field) =>
    ['title', 'slogan', 'description', 'logoUrl'].includes(field.key),
  ),
)

const aboutFields = computed(() =>
  appFields.value.filter((field) =>
    ['author', 'avatarUrl', 'aboutLead', 'aboutText'].includes(field.key),
  ),
)

const appearanceFields = computed(() =>
  fields.value.filter(
    (field) =>
      field.key.startsWith('appearance.') &&
      !contentAppearanceKeys.has(field.key) &&
      !legacyAppearanceKeys.has(field.key),
  ),
)

const themeFields = computed(() =>
  appearanceFields.value.filter((f) => f.key === 'appearance.theme'),
)

const sameValue = (left: any, right: any) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

const getDefaultFieldValue = (field: (typeof fields.value)[number]) =>
  field.value ?? field.defaultValue ?? null

const contentFields = computed(() => [
  ...appFields.value,
  ...contentAppearanceFields.value,
])

const isAppDirty = computed(() =>
  contentFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const isAppearanceDirty = computed(() =>
  appearanceFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

useUnsavedChangesGuard(() => isAppDirty.value || isAppearanceDirty.value)

const isAppearanceDefault = computed(() =>
  appearanceFields.value.every((field) =>
    sameValue(state[field.key], field.defaultValue ?? null),
  ),
)

const previewPhotos = computed(() =>
  photos.value.filter((photo) => photo.thumbnailUrl).slice(0, 8),
)

const resetAppSettings = () => {
  contentFields.value.forEach((field) => {
    state[field.key] = getDefaultFieldValue(field)
  })
}

const resetAppearanceSettings = () => {
  appearanceFields.value.forEach((field) => {
    state[field.key] = getDefaultFieldValue(field)
  })
}

const restoreAppearanceDefaults = () => {
  appearanceFields.value.forEach((field) => {
    state[field.key] = field.defaultValue ?? null
  })
}

const updateAppearanceSetting = (key: string, value: unknown) => {
  state[key] = value
}

const handleAppSettingsSubmit = async () => {
  const appData = Object.fromEntries(
    contentFields.value.map((f) => [f.key, state[f.key]]),
  )
  try {
    await submit(appData)
  } catch {
    /* empty */
  }
}

const socialLinks = computed<Record<string, string>>(() => {
  const value = state['appearance.home.socialLinks']
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {}
})

const updateSocialLink = (key: string, value: string) => {
  state['appearance.home.socialLinks'] = {
    ...socialLinks.value,
    [key]: value,
  }
}

const handleAppearanceSettingsSubmit = async () => {
  const appearanceData = Object.fromEntries(
    appearanceFields.value.map((f) => [f.key, state[f.key]]),
  )
  try {
    await submit(appearanceData)
    if (state['appearance.theme']) {
      colorMode.preference = state['appearance.theme']
    }
  } catch {
    /* empty */
  }
}
</script>

<template>
  <UDashboardPanel class="min-w-0 overflow-hidden">
    <template #header>
      <UDashboardNavbar :title="$t('title.generalSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <DashboardPageIntro
          :title="$t('title.generalSettings')"
          description="管理站点基础信息与展示外观。保存后会同步更新前台展示。"
          icon="lucide:sliders-horizontal"
        />

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              站点与公开内容
            </h3>
            <p class="mt-1 text-sm text-neutral-500">
              首页、关于页面和全站页脚分别管理，保存后同步更新前台。
            </p>
          </header>

          <div
            v-if="loading && appFields.length === 0"
            class="space-y-4 px-5 py-5"
          >
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-4 w-44" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-4 w-36" />
            <USkeleton class="h-10 w-full" />
          </div>

          <UForm
            v-else
            id="appSettingsForm"
            class="divide-y divide-neutral-200 px-5 dark:divide-neutral-800"
            @submit="handleAppSettingsSubmit"
          >
            <section class="space-y-5 py-5">
              <div>
                <h4 class="text-sm font-semibold">站点标识</h4>
                <p class="mt-1 text-sm text-neutral-500">
                  网站名称、简介与 Logo。Logo 留空时前台自动使用站点图标。
                </p>
              </div>
              <SettingField
                v-for="field in identityFields"
                :key="field.key"
                :field="field"
                :model-value="state[field.key]"
                @update:model-value="(val) => (state[field.key] = val)"
              />
            </section>

            <section class="space-y-5 py-5">
              <div>
                <h4 class="text-sm font-semibold">关于页面</h4>
                <p class="mt-1 text-sm text-neutral-500">
                  作者介绍和外部链接只在关于页面集中呈现；首页是否引用作者简介由下方“首页信息”控制。
                </p>
              </div>
              <SettingField
                v-for="field in aboutFields"
                :key="field.key"
                :field="field"
                :model-value="state[field.key]"
                @update:model-value="(val) => (state[field.key] = val)"
              />

              <div
                class="grid gap-4 border-t border-neutral-200 pt-5 sm:grid-cols-2 dark:border-neutral-800"
              >
                <UFormField label="个人网站">
                  <UInput
                    type="url"
                    icon="lucide:link"
                    :model-value="String(socialLinks.website || '')"
                    @update:model-value="
                      updateSocialLink('website', String($event))
                    "
                  />
                </UFormField>
                <UFormField label="Instagram">
                  <UInput
                    type="url"
                    icon="simple-icons:instagram"
                    :model-value="String(socialLinks.instagram || '')"
                    @update:model-value="
                      updateSocialLink('instagram', String($event))
                    "
                  />
                </UFormField>
                <UFormField label="X">
                  <UInput
                    type="url"
                    icon="simple-icons:x"
                    :model-value="String(socialLinks.x || '')"
                    @update:model-value="updateSocialLink('x', String($event))"
                  />
                </UFormField>
                <UFormField label="GitHub">
                  <UInput
                    type="url"
                    icon="simple-icons:github"
                    :model-value="String(socialLinks.github || '')"
                    @update:model-value="
                      updateSocialLink('github', String($event))
                    "
                  />
                </UFormField>
              </div>
            </section>

            <section class="space-y-5 py-5">
              <div>
                <h4 class="text-sm font-semibold">全站页脚</h4>
                <p class="mt-1 text-sm text-neutral-500">
                  固定显示在公开页面内容结束处，不参与首页模块排序。
                </p>
              </div>

              <label
                class="flex items-center justify-between gap-4 border-y border-neutral-200 py-3 text-sm dark:border-neutral-800"
              >
                <span>
                  <span class="block font-medium">显示全站页脚</span>
                  <span class="mt-1 block text-xs text-neutral-500"
                    >关闭后隐藏版权文案和备案信息。</span
                  >
                </span>
                <USwitch
                  class="shrink-0"
                  :model-value="state['appearance.footer.enabled'] !== false"
                  @update:model-value="
                    state['appearance.footer.enabled'] = $event
                  "
                />
              </label>

              <UFormField
                label="页脚文案"
                description="留空时自动显示当前年份和网站名称。"
              >
                <UTextarea
                  :rows="2"
                  :model-value="String(state['appearance.footer.text'] || '')"
                  @update:model-value="
                    state['appearance.footer.text'] = String($event)
                  "
                />
              </UFormField>

              <label
                class="flex items-center justify-between gap-4 border-y border-neutral-200 py-3 text-sm dark:border-neutral-800"
              >
                <span>
                  <span class="block font-medium">显示备案信息</span>
                  <span class="mt-1 block text-xs text-neutral-500"
                    >显示后链接至工信部备案查询网站。</span
                  >
                </span>
                <USwitch
                  class="shrink-0"
                  :model-value="state['appearance.footer.showIcp'] === true"
                  @update:model-value="
                    state['appearance.footer.showIcp'] = $event
                  "
                />
              </label>

              <UFormField label="备案号">
                <UInput
                  placeholder="粤ICP备XXXXXXXX号"
                  :disabled="state['appearance.footer.showIcp'] !== true"
                  :model-value="
                    String(state['appearance.footer.icpNumber'] || '')
                  "
                  @update:model-value="
                    state['appearance.footer.icpNumber'] = String($event)
                  "
                />
              </UFormField>
            </section>
          </UForm>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isAppDirty"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isAppDirty"
                @click="resetAppSettings"
              >
                重置
              </UButton>
              <UButton
                :loading="loading"
                type="submit"
                form="appSettingsForm"
                :disabled="!isAppDirty"
                icon="tabler:device-floppy"
              >
                保存设置
              </UButton>
            </div>
          </footer>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {{ $t('title.appearanceSettings') }}
            </h3>
          </header>

          <div
            v-if="loading && appearanceFields.length === 0"
            class="space-y-4 px-5 py-5"
          >
            <USkeleton class="h-4 w-40" />
            <USkeleton class="h-10 w-full" />
          </div>

          <UForm
            v-else
            id="appearanceSettingsForm"
            class="px-5 py-5"
            @submit="handleAppearanceSettingsSubmit"
          >
            <div class="space-y-5">
              <div>
                <h4
                  class="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  基础主题
                </h4>
                <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  设置站点默认明暗主题，访客仍可在前台临时切换。
                </p>
              </div>
              <SettingField
                v-for="field in themeFields"
                :key="field.key"
                :field="field"
                :model-value="state[field.key]"
                @update:model-value="(val) => (state[field.key] = val)"
              />
            </div>

            <div
              class="mt-7 border-t border-neutral-200 pt-6 dark:border-neutral-800"
            >
              <div>
                <h4
                  class="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  首页展示
                </h4>
                <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  按内容来源、导航、布局、信息和视觉顺序调整公开首页。
                </p>
              </div>

              <SettingThemeEditor
                class="mt-6"
                :settings="state"
                :title="String(state.title || 'LumaAtlas')"
                :author="String(state.author || '')"
                :slogan="String(state.slogan || '')"
                :description="String(state.description || '')"
                :avatar-url="String(state.avatarUrl || '')"
                :photos="previewPhotos"
                @change="updateAppearanceSetting"
              />
            </div>
          </UForm>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isAppearanceDirty"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div
              class="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-end"
            >
              <UButton
                color="neutral"
                variant="outline"
                class="min-w-0 justify-center whitespace-nowrap px-2 text-xs sm:px-3 sm:text-sm"
                :disabled="!isAppearanceDirty"
                @click="resetAppearanceSettings"
              >
                撤销改动
              </UButton>
              <UButton
                color="neutral"
                variant="soft"
                class="min-w-0 justify-center whitespace-nowrap px-2 text-xs sm:px-3 sm:text-sm"
                :disabled="isAppearanceDefault"
                icon="lucide:rotate-ccw"
                @click="restoreAppearanceDefaults"
              >
                恢复默认
              </UButton>
              <UButton
                :loading="loading"
                class="min-w-0 justify-center whitespace-nowrap px-2 text-xs sm:px-3 sm:text-sm"
                type="submit"
                form="appearanceSettingsForm"
                :disabled="!isAppearanceDirty"
                icon="tabler:device-floppy"
              >
                保存设置
              </UButton>
            </div>
          </footer>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped></style>
