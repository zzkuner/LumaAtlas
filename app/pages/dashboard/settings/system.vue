<script lang="ts" setup>
import type { FieldDescriptor } from '~~/shared/types/settings'

definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('title.systemSettings'),
})

const {
  fields: rawSystemFields,
  state: systemState,
  submit: submitSystem,
  loading: systemLoading,
} = useSettingsForm('system')

const systemFields = computed(() =>
  rawSystemFields.value.filter((field) => !field.isReadonly),
)

type SystemSection = {
  id: string
  titleKey: string
  keys: string[]
}

type SystemSectionWithFields = SystemSection & {
  fields: FieldDescriptor[]
}

const SYSTEM_SECTION_ORDER: SystemSection[] = [
  {
    id: 'thirdPartyLogin',
    titleKey: 'settings.system.sections.thirdPartyLogin',
    keys: [
      'auth.github.enabled',
      'auth.github.clientId',
      'auth.github.clientSecret',
    ],
  },
  {
    id: 'fileProcessing',
    titleKey: 'settings.system.sections.fileProcessing',
    keys: [
      'upload.maxFileSize',
      'upload.duplicateCheck.enabled',
      'upload.duplicateCheck.mode',
    ],
  },
  {
    id: 'responsiveImages',
    titleKey: 'settings.system.sections.responsiveImages',
    keys: [
      'image.responsive.enabled',
      'image.responsive.smallWidth',
      'image.responsive.mediumWidth',
      'image.responsive.largeWidth',
      'image.responsive.quality',
    ],
  },
  {
    id: 'debug',
    titleKey: 'settings.system.sections.debugSettings',
    keys: ['webglImageViewerDebug'],
  },
] as const

const isFieldDescriptor = (
  field: FieldDescriptor | undefined,
): field is FieldDescriptor => Boolean(field)

const systemFieldSections = computed<SystemSectionWithFields[]>(() =>
  SYSTEM_SECTION_ORDER.map((section) => ({
    ...section,
    fields: section.keys
      .map((key) => systemFields.value.find((field) => field.key === key))
      .filter(isFieldDescriptor),
  })).filter((section) => section.fields.length > 0),
)

const sameValue = (left: any, right: any) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

const getDefaultFieldValue = (field: (typeof rawSystemFields.value)[number]) =>
  field.value ?? field.defaultValue ?? null

const getSectionFormId = (sectionId: string) =>
  `systemSettingsForm-${sectionId}`

const isSectionDirty = (section: SystemSectionWithFields) =>
  section.fields.some(
    (field) => !sameValue(systemState[field.key], getDefaultFieldValue(field)),
  )

const resetSectionSettings = (section: SystemSectionWithFields) => {
  section.fields.forEach((field) => {
    systemState[field.key] = getDefaultFieldValue(field)
  })
}

const handleSectionSettingsSubmit = async (
  section: SystemSectionWithFields,
) => {
  const systemData = Object.fromEntries(
    section.fields.map((f) => [f.key, systemState[f.key]]),
  )

  try {
    await submitSystem(systemData)
  } catch {
    /* empty */
  }
}

const maintenanceLoading = ref(false)
const maintenanceResult = ref<{
  expiredShares: number
  oldQueueTasks: number
  completedAt: string
} | null>(null)
const toast = useToast()

const runMaintenance = async () => {
  maintenanceLoading.value = true
  try {
    maintenanceResult.value = await $fetch('/api/system/maintenance/cleanup', {
      method: 'POST',
    })
    toast.add({ title: '系统清理完成', color: 'success' })
  } catch (error) {
    toast.add({
      title: '系统清理失败',
      description: error instanceof Error ? error.message : String(error),
      color: 'error',
    })
  } finally {
    maintenanceLoading.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.systemSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <section
          class="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800"
        >
          <h2
            class="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ $t('title.systemSettings') }}
          </h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            配置系统级行为参数。这里的修改会影响全局上传和服务行为。
          </p>
        </section>

        <template v-if="systemLoading && systemFieldSections.length === 0">
          <section
            v-for="index in 3"
            :key="index"
            class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <header
              class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
            >
              <USkeleton class="h-5 w-32" />
            </header>
            <div class="space-y-4 px-5 py-5">
              <USkeleton class="h-4 w-40" />
              <USkeleton class="h-10 w-full" />
            </div>
          </section>
        </template>

        <section
          v-for="section in systemFieldSections"
          :key="section.id"
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {{ $t(section.titleKey) }}
            </h3>
          </header>

          <UForm
            :id="getSectionFormId(section.id)"
            class="space-y-5 px-5 py-5"
            @submit="handleSectionSettingsSubmit(section)"
          >
            <SettingField
              v-for="field in section.fields"
              :key="field.key"
              :field="field"
              :model-value="systemState[field.key]"
              @update:model-value="(val) => (systemState[field.key] = val)"
            />
          </UForm>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isSectionDirty(section)"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isSectionDirty(section)"
                @click="resetSectionSettings(section)"
              >
                重置
              </UButton>
              <UButton
                :loading="systemLoading"
                type="submit"
                :form="getSectionFormId(section.id)"
                :disabled="!isSectionDirty(section)"
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
              数据维护
            </h3>
          </header>
          <div
            class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p
                class="text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                清理过期运行数据
              </p>
              <p
                class="mt-1 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400"
              >
                删除已过期的分享记录、30 天前已完成的队列任务和 90
                天前失败的队列任务，不会删除照片文件。
              </p>
              <p
                v-if="maintenanceResult"
                class="mt-2 text-xs text-neutral-500"
              >
                已清理 {{ maintenanceResult.expiredShares }} 个过期分享，{{
                  maintenanceResult.oldQueueTasks
                }}
                条旧任务。
              </p>
            </div>
            <UButton
              class="shrink-0"
              color="neutral"
              variant="outline"
              icon="lucide:eraser"
              :loading="maintenanceLoading"
              @click="runMaintenance"
            >
              立即清理
            </UButton>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
