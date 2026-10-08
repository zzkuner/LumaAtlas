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

const appearanceFields = computed(() =>
  fields.value.filter((f) => f.key.startsWith('appearance.')),
)

const themeFields = computed(() =>
  appearanceFields.value.filter((f) => f.key === 'appearance.theme'),
)

const sameValue = (left: any, right: any) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

const getDefaultFieldValue = (field: (typeof fields.value)[number]) =>
  field.value ?? field.defaultValue ?? null

const isAppDirty = computed(() =>
  appFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const isAppearanceDirty = computed(() =>
  appearanceFields.value.some(
    (field) => !sameValue(state[field.key], getDefaultFieldValue(field)),
  ),
)

const isAppearanceDefault = computed(() =>
  appearanceFields.value.every((field) =>
    sameValue(state[field.key], field.defaultValue ?? null),
  ),
)

const previewPhotos = computed(() =>
  photos.value.filter((photo) => photo.thumbnailUrl).slice(0, 8),
)

const resetAppSettings = () => {
  appFields.value.forEach((field) => {
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
    appFields.value.map((f) => [f.key, state[f.key]]),
  )
  try {
    await submit(appData)
  } catch {
    /* empty */
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.generalSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <section
          class="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800"
        >
          <h2
            class="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ $t('title.generalSettings') }}
          </h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            管理站点基础信息与展示外观。更改会立即影响控制台和前台展示。
          </p>
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
              {{ $t('title.generalSettings') }}
            </h3>
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
            class="space-y-5 px-5 py-5"
            @submit="handleAppSettingsSubmit"
          >
            <SettingField
              v-for="field in appFields"
              :key="field.key"
              :field="field"
              :model-value="state[field.key]"
              @update:model-value="(val) => (state[field.key] = val)"
            />
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
                  调整公开相册的页头风格、图片密度与辅助信息。
                </p>
              </div>

              <SettingThemeEditor
                class="mt-6"
                :settings="state"
                :title="String(state.title || 'LumaAtlas')"
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

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isAppearanceDirty"
                @click="resetAppearanceSettings"
              >
                撤销改动
              </UButton>
              <UButton
                color="neutral"
                variant="soft"
                :disabled="isAppearanceDefault"
                icon="lucide:rotate-ccw"
                @click="restoreAppearanceDefaults"
              >
                恢复默认
              </UButton>
              <UButton
                :loading="loading"
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
