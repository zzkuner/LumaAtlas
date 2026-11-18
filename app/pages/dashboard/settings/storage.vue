<script lang="ts" setup>
import { UBadge, UButton, UChip } from '#components'
import type { TableColumn } from '@nuxt/ui'
import {
  s3StorageConfigSchema,
  r2StorageConfigSchema,
  localStorageConfigSchema,
  openListStorageConfigSchema,
  type StorageConfig,
} from '~~/shared/types/storage'

definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('title.storageSettings'),
})

const toast = useToast()
const pendingDeleteStorage = ref<SettingStorageProvider | null>(null)
const deletingStorage = ref(false)
const checkingStorage = ref(false)
const { data: storageHealth, refresh: refreshStorageHealth } = await useFetch<{
  status: 'healthy' | 'degraded' | 'unavailable'
  provider: string | null
  latencyMs: number | null
  checkedAt: string
  message: string
}>('/api/system/storage/health')

const storageHealthColor = computed(() => {
  if (storageHealth.value?.status === 'healthy') return 'success'
  if (storageHealth.value?.status === 'degraded') return 'warning'
  return 'error'
})

const checkStorageHealth = async () => {
  checkingStorage.value = true
  try {
    await refreshStorageHealth()
  } finally {
    checkingStorage.value = false
  }
}

const { data: currentStorageProvider, refresh: refreshCurrentStorageProvider } =
  await useFetch<{
    namespace: string
    key: string
    value: SettingValue
  }>('/api/system/settings/storage/provider')

const {
  data: availableStorage,
  refresh: refreshAvailableStorage,
  status: availableStorageStatus,
} = await useFetch<SettingStorageProvider[]>(
  '/api/system/settings/storage-config',
)

const PROVIDER_ICON = {
  s3: 'tabler:brand-aws',
  r2: 'lucide:cloud-upload',
  local: 'tabler:database',
  openlist: 'tabler:cloud',
}

const PROVIDER_LABEL = {
  s3: 'S3 兼容存储',
  r2: 'Cloudflare R2',
  local: '本地存储',
  openlist: 'OpenList',
}

const isActiveProvider = (provider: SettingStorageProvider) =>
  currentStorageProvider.value?.value === provider.id

type MigrationStage = 'copying' | 'copied' | 'verifying' | 'complete' | 'failed'
interface MigrationStatus {
  id: string
  sourceProviderId: number
  targetProviderId: number
  targetName: string
  stage: MigrationStage
  total: number
  processed: number
  copied: number
  reused: number
  error: string | null
}

const migrationStatus = ref<MigrationStatus | null>(null)
const migrationStatusUrl: string = '/api/system/settings/storage-migration'
const requestMigration = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await response.text()
  const result = body ? JSON.parse(body) : null
  if (!response.ok) {
    throw new Error(
      result?.statusMessage || result?.message || `HTTP ${response.status}`,
    )
  }
  return result as T
}
const refreshMigrationStatus = async () => {
  migrationStatus.value = await requestMigration<MigrationStatus | null>(
    migrationStatusUrl,
  )
}
const migrationTargetId = ref<number | undefined>(
  availableStorage.value?.find((item) => !isActiveProvider(item))?.id,
)
const migrationSubmitting = ref(false)
const migrationBusy = computed(
  () =>
    migrationSubmitting.value ||
    migrationStatus.value?.stage === 'copying' ||
    migrationStatus.value?.stage === 'verifying',
)

let migrationPollTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  void refreshMigrationStatus().catch(() => undefined)
  migrationPollTimer = setInterval(() => {
    if (migrationBusy.value) {
      void refreshMigrationStatus().catch(() => undefined)
    }
  }, 1500)
})
onUnmounted(() => {
  if (migrationPollTimer) clearInterval(migrationPollTimer)
})

watch(
  () => migrationStatus.value?.stage,
  async (stage, previous) => {
    if (stage === 'complete' && previous !== 'complete') {
      await refreshCurrentStorageProvider()
      await refreshStorageHealth()
      resetStorageDefault()
      migrationTargetId.value = availableStorage.value?.find(
        (item) => !isActiveProvider(item),
      )?.id
    }
  },
)

const startMigration = async () => {
  if (!migrationTargetId.value) return
  migrationSubmitting.value = true
  try {
    migrationStatus.value = await requestMigration<MigrationStatus>(
      migrationStatusUrl,
      {
        method: 'POST',
        body: JSON.stringify({ targetProviderId: migrationTargetId.value }),
      },
    )
    toast.add({ title: '开始复制照片文件', color: 'success' })
  } catch (error) {
    toast.add({
      title: '无法开始迁移',
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    migrationSubmitting.value = false
  }
}

const activateMigration = async () => {
  if (!migrationStatus.value || migrationStatus.value.stage !== 'copied') return
  migrationSubmitting.value = true
  try {
    migrationStatus.value = await requestMigration<MigrationStatus>(
      `${migrationStatusUrl}/activate`,
      {
        method: 'POST',
        body: JSON.stringify({ jobId: migrationStatus.value.id }),
      },
    )
    toast.add({ title: '正在复核文件并切换存储', color: 'success' })
  } catch (error) {
    toast.add({
      title: '无法切换存储',
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    migrationSubmitting.value = false
  }
}

const confirmActivateMigration = (close: () => void) => {
  void activateMigration()
  close()
}

const getProviderDisplayName = (provider: SettingStorageProvider) => {
  if (/^Migrated\s+.+\s+Provider$/i.test(provider.name)) {
    return PROVIDER_LABEL[provider.provider] || provider.name
  }
  return provider.name
}

const availableStorageColumns: TableColumn<SettingStorageProvider>[] = [
  {
    accessorKey: 'status',
    header: '',
    meta: {
      class: {
        th: 'w-10',
      },
    },
    cell: (cell) => {
      const isActive =
        currentStorageProvider.value?.value === cell.row.original.id
      return h(UChip, {
        size: 'md',
        inset: true,
        standalone: true,
        color: isActive ? 'success' : undefined,
        ui: {
          base: !isActive ? 'bg-neutral-200 dark:bg-neutral-700' : '',
        },
      })
    },
  },
  {
    accessorKey: 'name',
    header: '存储名称',
    cell: (cell) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', getProviderDisplayName(cell.row.original)),
        ...(isActiveProvider(cell.row.original)
          ? [
              h(
                UBadge,
                { color: 'success', variant: 'soft', size: 'sm' },
                { default: () => '当前使用' },
              ),
            ]
          : []),
      ]),
  },
  {
    accessorKey: 'provider',
    header: '存储类型',
    cell: (cell) =>
      PROVIDER_LABEL[cell.row.original.provider] || cell.row.original.provider,
  },
  {
    accessorKey: 'actions',
    header: '操作',
    cell: (cell) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          UButton,
          {
            size: 'sm',
            variant: 'soft',
            color: 'error',
            icon: 'tabler:trash',
            disabled:
              currentStorageProvider.value?.value === cell.row.original.id,
            onClick: () => {
              pendingDeleteStorage.value = cell.row.original
            },
          },
          { default: () => '删除' },
        ),
      ])
    },
  },
]

const storageSettingsState = reactive<{
  storageConfigId?: number
}>({
  storageConfigId: currentStorageProvider.value
    ? (currentStorageProvider.value.value as number)
    : undefined,
})

const isStorageDefaultDirty = computed(() => {
  return (
    storageSettingsState.storageConfigId !== currentStorageProvider.value?.value
  )
})

useUnsavedChangesGuard(isStorageDefaultDirty)

const resetStorageDefault = () => {
  storageSettingsState.storageConfigId = currentStorageProvider.value
    ? (currentStorageProvider.value.value as number)
    : undefined
}

const handleStorageSettingsSubmit = async (close?: () => void) => {
  try {
    const savedProvider = await $fetch<{
      namespace: string
      key: string
      value: SettingValue
    }>('/api/system/settings/storage/provider', {
      method: 'PUT',
      body: {
        value: storageSettingsState.storageConfigId,
      },
    })
    currentStorageProvider.value = savedProvider
    close?.()
    toast.add({
      title: '设置已保存',
      color: 'success',
    })
  } catch (error) {
    toast.add({
      title: '保存设置时出错',
      description: (error as Error).message,
      color: 'error',
    })
  }
}

const providerOptions = [
  { label: 'AWS S3 兼容存储', value: 's3', icon: PROVIDER_ICON.s3 },
  { label: 'Cloudflare R2', value: 'r2', icon: PROVIDER_ICON.r2 },
  { label: '本地存储', value: 'local', icon: PROVIDER_ICON.local },
  { label: 'OpenList', value: 'openlist', icon: PROVIDER_ICON.openlist },
]

const storageConfigState = reactive<{
  name: string
  provider: string
  config: Partial<StorageConfig>
}>({
  name: '',
  provider: 's3',
  config: {
    provider: 's3',
    region: 'auto',
    prefix: '/photos',
  } as any,
})
const testingR2 = ref(false)
const r2Verified = ref(false)

watch(
  () => storageConfigState.config,
  () => {
    r2Verified.value = false
  },
  { deep: true },
)

const testR2Connection = async () => {
  const parsed = r2StorageConfigSchema.safeParse(storageConfigState.config)
  if (!parsed.success) {
    toast.add({
      title: '请先填写完整的 R2 配置',
      description: parsed.error.issues[0]?.message,
      color: 'warning',
    })
    return
  }

  testingR2.value = true
  try {
    await $fetch('/api/system/settings/storage-config/verify', {
      method: 'POST',
      body: parsed.data,
    })
    r2Verified.value = true
    toast.add({ title: 'R2 连接成功', color: 'success' })
  } catch (error) {
    r2Verified.value = false
    toast.add({
      title: 'R2 连接失败',
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    testingR2.value = false
  }
}

// 根据 provider 值动态选择对应的 schema
const currentStorageSchema = computed(() => {
  const provider = storageConfigState.provider
  switch (provider) {
    case 'local':
      return localStorageConfigSchema
    case 'openlist':
      return openListStorageConfigSchema
    case 'r2':
      return r2StorageConfigSchema
    case 's3':
    default:
      return s3StorageConfigSchema
  }
})

// 获取存储配置的默认值
const getStorageConfigDefaults = (provider: string): Partial<StorageConfig> => {
  switch (provider) {
    case 'local':
      return {
        provider: 'local',
        basePath: '/data/storage',
        baseUrl: '/storage',
      } as any
    case 'openlist':
      return {
        provider: 'openlist',
        uploadEndpoint: '/api/fs/put',
        deleteEndpoint: '/api/fs/remove',
        metaEndpoint: '/api/fs/get',
        pathField: 'path',
      } as any
    case 'r2':
      return {
        provider: 'r2',
        jurisdiction: 'default',
        prefix: 'photos',
        cdnUrl: '',
      } as any
    case 's3':
    default:
      return {
        provider: 's3',
        region: 'auto',
        prefix: '/photos',
      } as any
  }
}

// 动态生成 fields-config，包含翻译键
const storageFieldsConfig = computed<Record<string, any>>(() => {
  const provider = storageConfigState.provider
  const baseKey = `settings.storage.${provider}`

  switch (provider) {
    case 'local':
      return {
        provider: { hidden: true },
        basePath: {
          label: $t(`${baseKey}.basePath.label`),
          description: $t(`${baseKey}.basePath.description`),
        },
        baseUrl: {
          label: $t(`${baseKey}.baseUrl.label`),
          description: $t(`${baseKey}.baseUrl.description`),
        },
        prefix: {
          label: $t(`${baseKey}.prefix.label`),
          description: $t(`${baseKey}.prefix.description`),
        },
      }
    case 'openlist':
      return {
        provider: { hidden: true },
        baseUrl: {
          label: $t(`${baseKey}.baseUrl.label`),
          description: $t(`${baseKey}.baseUrl.description`),
        },
        rootPath: {
          label: $t(`${baseKey}.rootPath.label`),
          description: $t(`${baseKey}.rootPath.description`),
        },
        token: {
          label: $t(`${baseKey}.token.label`),
          description: $t(`${baseKey}.token.description`),
        },
        uploadEndpoint: {
          label: $t(`${baseKey}.uploadEndpoint.label`),
          description: $t(`${baseKey}.uploadEndpoint.description`),
        },
        downloadEndpoint: {
          label: $t(`${baseKey}.downloadEndpoint.label`),
          description: $t(`${baseKey}.downloadEndpoint.description`),
        },
        listEndpoint: {
          label: $t(`${baseKey}.listEndpoint.label`),
          description: $t(`${baseKey}.listEndpoint.description`),
        },
        deleteEndpoint: {
          label: $t(`${baseKey}.deleteEndpoint.label`),
          description: $t(`${baseKey}.deleteEndpoint.description`),
        },
        metaEndpoint: {
          label: $t(`${baseKey}.metaEndpoint.label`),
          description: $t(`${baseKey}.metaEndpoint.description`),
        },
        pathField: {
          label: $t(`${baseKey}.pathField.label`),
          description: $t(`${baseKey}.pathField.description`),
        },
        cdnUrl: {
          label: $t(`${baseKey}.cdnUrl.label`),
          description: $t(`${baseKey}.cdnUrl.description`),
        },
      }
    case 'r2':
      return {
        provider: { hidden: true },
        accountId: {
          label: 'Cloudflare 账户 ID',
          description: 'R2 概览中的 32 位账户 ID，不是 API 令牌。',
          placeholder: '32 位账户 ID',
        },
        jurisdiction: {
          label: '数据地域',
          description: '仅当存储桶创建在 EU 或 US 专属地域时选择对应选项。',
          selectProps: {
            items: [
              { label: '默认', value: 'default' },
              { label: 'EU', value: 'eu' },
              { label: 'US', value: 'us' },
            ],
          },
        },
        bucket: {
          label: '存储桶名称',
          description: '先在 Cloudflare R2 中创建存储桶。',
        },
        accessKeyId: { label: 'Access Key ID' },
        secretAccessKey: {
          label: 'Secret Access Key',
          inputProps: { type: 'password', autocomplete: 'new-password' },
        },
        prefix: {
          label: '照片目录前缀',
          description: '新上传的照片写入这个前缀；建议保留 photos。',
        },
        cdnUrl: {
          label: '公开图片域名（可选）',
          description:
            '留空时由本站代理读取私有桶；填写已绑定 R2 桶的 HTTPS 自定义域名可加速访问。',
          placeholder: 'https://images.example.com',
        },
      }
    case 's3':
    default:
      return {
        provider: { hidden: true },
        bucket: {
          label: $t(`${baseKey}.bucket.label`),
          description: $t(`${baseKey}.bucket.description`),
        },
        region: {
          label: $t(`${baseKey}.region.label`),
          description: $t(`${baseKey}.region.description`),
        },
        endpoint: {
          label: $t(`${baseKey}.endpoint.label`),
          description: $t(`${baseKey}.endpoint.description`),
        },
        prefix: {
          label: $t(`${baseKey}.prefix.label`),
          description: $t(`${baseKey}.prefix.description`),
        },
        cdnUrl: {
          label: $t(`${baseKey}.cdnUrl.label`),
          description: $t(`${baseKey}.cdnUrl.description`),
        },
        accessKeyId: {
          label: $t(`${baseKey}.accessKeyId.label`),
          description: $t(`${baseKey}.accessKeyId.description`),
        },
        secretAccessKey: {
          label: $t(`${baseKey}.secretAccessKey.label`),
          description: $t(`${baseKey}.secretAccessKey.description`),
        },
        forcePathStyle: {
          label: $t(`${baseKey}.forcePathStyle.label`),
          description: $t(`${baseKey}.forcePathStyle.description`),
        },
        maxKeys: {
          label: $t(`${baseKey}.maxKeys.label`),
          description: $t(`${baseKey}.maxKeys.description`),
        },
      }
  }
})

const onStorageConfigSubmit = async (
  event: { data: Partial<StorageConfig> },
  close?: () => void,
) => {
  try {
    const payload = {
      name: storageConfigState.name,
      provider: storageConfigState.provider,
      config: event.data,
    }

    await $fetch('/api/system/settings/storage-config', {
      method: 'POST',
      body: payload,
    })
    refreshAvailableStorage()
    toast.add({
      title: '存储方案已创建',
      color: 'success',
    })
    // 重置表单
    storageConfigState.name = ''
    storageConfigState.provider = 's3'
    storageConfigState.config = getStorageConfigDefaults('s3')
    r2Verified.value = false
    close?.()
  } catch (error) {
    toast.add({
      title: '创建存储方案时出错',
      description: (error as Error).message,
      color: 'error',
    })
  }
}

const onStorageDelete = async () => {
  if (!pendingDeleteStorage.value) return
  const storageId = pendingDeleteStorage.value.id
  deletingStorage.value = true
  try {
    await $fetch(`/api/system/settings/storage-config/${storageId}`, {
      method: 'DELETE',
    })
    pendingDeleteStorage.value = null
    availableStorage.value = (availableStorage.value ?? []).filter(
      (provider) => provider.id !== storageId,
    )
    toast.add({
      title: '存储方案已删除',
      color: 'success',
    })
  } catch (error) {
    toast.add({
      title: '删除存储方案失败',
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    deletingStorage.value = false
  }
}

const closeStorageDeleteConfirmation = () => {
  pendingDeleteStorage.value = null
}
</script>

<template>
  <UDashboardPanel class="min-w-0 overflow-hidden">
    <template #header>
      <UDashboardNavbar :title="$t('title.storageSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <UModal
          :open="pendingDeleteStorage !== null"
          @update:open="
            (open) => {
              if (!open) pendingDeleteStorage = null
            }
          "
        >
          <template #body>
            <h2 class="text-lg font-semibold">删除存储方案</h2>
            <p class="mt-2 text-sm text-muted">
              将删除“{{
                pendingDeleteStorage?.name
              }}”的连接配置，不会删除存储中的文件。若旧照片仍依赖此方案，删除后可能无法访问，请先确认已完成迁移。
            </p>
          </template>
          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="deletingStorage"
                @click="closeStorageDeleteConfirmation"
                >取消</UButton
              >
              <UButton
                color="error"
                icon="lucide:trash-2"
                :loading="deletingStorage"
                @click="onStorageDelete"
                >删除方案</UButton
              >
            </div>
          </template>
        </UModal>
        <DashboardPageIntro
          :title="$t('title.storageSettings')"
          description="管理照片存储连接。已有照片请先使用迁移工具复制并校验。"
          icon="lucide:database"
        />

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div>
              <h3
                class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
              >
                存储健康状态
              </h3>
              <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                只读探测当前提供者，并在有照片时检查最新对象是否可访问。
              </p>
            </div>
            <UButton
              icon="lucide:refresh-cw"
              color="neutral"
              variant="outline"
              size="sm"
              :loading="checkingStorage"
              @click="checkStorageHealth"
            >
              重新检测
            </UButton>
          </header>
          <div class="grid gap-4 px-5 py-5 sm:grid-cols-3">
            <div>
              <p class="text-xs text-neutral-500">状态</p>
              <UBadge
                class="mt-2"
                :color="storageHealthColor"
                variant="soft"
              >
                {{ storageHealth?.status || 'checking' }}
              </UBadge>
            </div>
            <div>
              <p class="text-xs text-neutral-500">当前提供者</p>
              <p class="mt-2 text-sm font-medium">
                {{ storageHealth?.provider || '--' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-neutral-500">响应耗时</p>
              <p class="mt-2 text-sm font-medium">
                {{ storageHealth?.latencyMs ?? '--' }} ms
              </p>
            </div>
            <p
              class="text-sm leading-6 text-neutral-600 sm:col-span-3 dark:text-neutral-400"
            >
              {{ storageHealth?.message || '正在检测存储状态。' }}
            </p>
          </div>
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
              存储空间迁移
            </h3>
          </header>
          <div class="space-y-4 px-5 py-5">
            <p class="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              先复制原图、缩略图和实况视频并逐一校验，完成后再单独切换默认存储。源文件不会删除；迁移期间请暂停上传和编辑照片。
            </p>
            <UFormField
              label="目标存储方案"
              class="max-w-sm"
            >
              <USelectMenu
                v-model="migrationTargetId"
                :items="
                  availableStorage
                    ?.filter((item) => !isActiveProvider(item))
                    .map((item) => ({
                      label: getProviderDisplayName(item),
                      value: item.id,
                    })) || []
                "
                label-key="label"
                value-key="value"
                placeholder="选择另一个存储方案"
                :disabled="migrationBusy || migrationStatus?.stage === 'copied'"
                class="w-full"
              />
            </UFormField>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                icon="lucide:copy"
                color="neutral"
                variant="outline"
                :disabled="
                  !migrationTargetId ||
                  migrationBusy ||
                  migrationStatus?.stage === 'copied'
                "
                :loading="
                  migrationSubmitting && migrationStatus?.stage !== 'verifying'
                "
                @click="startMigration"
              >
                {{
                  migrationStatus?.stage === 'failed'
                    ? '重新复制并校验'
                    : '复制并校验'
                }}
              </UButton>
              <UModal
                v-if="migrationStatus?.stage === 'copied'"
                title="切换默认存储"
                :ui="{ footer: 'justify-end' }"
              >
                <UButton
                  icon="lucide:check"
                  color="primary"
                  >切换到目标存储</UButton
                >
                <template #body>
                  <p class="text-sm leading-6">
                    已校验
                    {{
                      migrationStatus.processed
                    }}
                    个文件。切换后网站将从目标存储
                    读取照片，原存储文件仍保留。请先确认已备份数据库与数据目录。
                  </p>
                </template>
                <template #footer="{ close }">
                  <UButton
                    color="neutral"
                    variant="outline"
                    @click="close"
                    >取消</UButton
                  >
                  <UButton
                    icon="lucide:check"
                    :loading="migrationSubmitting"
                    @click="confirmActivateMigration(close)"
                  >
                    确认切换
                  </UButton>
                </template>
              </UModal>
            </div>
            <div
              v-if="migrationStatus"
              class="space-y-2"
              aria-live="polite"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {{
                    migrationStatus.stage === 'copying'
                      ? '正在复制'
                      : migrationStatus.stage === 'copied'
                        ? '复制完成，等待切换'
                        : migrationStatus.stage === 'verifying'
                          ? '正在复核并切换'
                          : migrationStatus.stage === 'complete'
                            ? '已切换到目标存储'
                            : '迁移失败'
                  }}
                </span>
                <span class="tabular-nums text-neutral-500">
                  {{ migrationStatus.processed }} / {{ migrationStatus.total }}
                </span>
              </div>
              <progress
                :value="migrationStatus.processed"
                :max="Math.max(1, migrationStatus.total)"
                class="h-1.5 w-full accent-primary"
              />
              <p class="text-xs text-neutral-500">
                已复制 {{ migrationStatus.copied }} · 已校验复用
                {{ migrationStatus.reused }}
              </p>
              <p
                v-if="migrationStatus.error"
                class="text-sm text-red-600 dark:text-red-400"
              >
                {{ migrationStatus.error }}。源存储未删除，可修复后重新运行。
              </p>
            </div>
          </div>
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
              当前默认存储
            </h3>
          </header>

          <div
            v-if="availableStorageStatus !== 'success' && !availableStorage"
            class="space-y-4 px-5 py-5"
          >
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-10 w-72" />
          </div>

          <div
            v-else
            class="space-y-4 px-5 py-5"
          >
            <UFormField
              name="storageConfigId"
              label="存储方案"
              required
              :ui="{
                container: 'w-full sm:max-w-sm *:w-full',
              }"
            >
              <USelectMenu
                v-model="storageSettingsState.storageConfigId"
                :icon="
                  PROVIDER_ICON[
                    availableStorage?.find(
                      (item) =>
                        item.id === storageSettingsState.storageConfigId,
                    )?.provider || 'local'
                  ] || 'tabler:database'
                "
                :items="
                  availableStorage?.map((item) => ({
                    icon: PROVIDER_ICON[item.provider] || 'tabler:database',
                    label: `${getProviderDisplayName(item)}${isActiveProvider(item) ? ' · 当前使用' : ''}`,
                    value: item.id,
                  }))
                "
                label-key="label"
                value-key="value"
                placeholder="选择存储方案"
              />
            </UFormField>
          </div>

          <footer
            class="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <div
              v-if="isStorageDefaultDirty"
              class="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800 dark:border-warning-900/60 dark:bg-warning-950/30 dark:text-warning-200"
            >
              {{ $t('common.unsavedChanges') }}
            </div>

            <div class="flex items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isStorageDefaultDirty"
                @click="resetStorageDefault"
              >
                重置
              </UButton>
              <UModal
                title="变更存储方案"
                :ui="{ footer: 'justify-end' }"
              >
                <UButton
                  :disabled="!isStorageDefaultDirty"
                  icon="tabler:device-floppy"
                >
                  保存设置
                </UButton>

                <template #body>
                  <UAlert
                    color="neutral"
                    variant="subtle"
                    title="注意"
                    description="新照片将写入所选方案，旧文件不会迁移。当前照片读取也依赖正在使用的存储连接；切换前请确认旧文件可从新方案访问，或先完成迁移。"
                    icon="tabler:arrows-exchange"
                  />
                </template>

                <template #footer="{ close }">
                  <UButton
                    label="取消"
                    color="neutral"
                    variant="outline"
                    @click="close"
                  />
                  <UButton
                    label="继续"
                    variant="soft"
                    icon="tabler:arrows-exchange"
                    type="submit"
                    form="storageSettingsForm"
                    @click="handleStorageSettingsSubmit(close)"
                  />
                </template>
              </UModal>
            </div>
          </footer>
        </section>

        <section
          class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <header
            class="flex w-full items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3
              class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              存储方案管理
            </h3>
            <div>
              <USlideover
                title="创建存储方案"
                :ui="{ footer: 'justify-end' }"
              >
                <UButton
                  size="sm"
                  variant="soft"
                  icon="tabler:plus"
                >
                  添加存储
                </UButton>

                <template #body="{ close }">
                  <div class="space-y-4">
                    <!-- Provider 选择 -->
                    <UFormField
                      label="存储类型"
                      class="w-full"
                      required
                      :ui="{
                        container: 'sm:max-w-full',
                      }"
                    >
                      <USelectMenu
                        v-model="storageConfigState.provider"
                        :icon="
                          PROVIDER_ICON[
                            storageConfigState.provider as keyof typeof PROVIDER_ICON
                          ] || 'tabler:database'
                        "
                        :items="providerOptions"
                        label-key="label"
                        value-key="value"
                        placeholder="选择存储类型"
                        @update:model-value="
                          (val: string) => {
                            storageConfigState.provider = val
                            storageConfigState.config =
                              getStorageConfigDefaults(val)
                            if (val === 'r2' && !storageConfigState.name.trim())
                              storageConfigState.name = 'Cloudflare R2'
                          }
                        "
                      />
                    </UFormField>

                    <UFormField
                      label="存储名称"
                      required
                      :ui="{
                        container: 'sm:max-w-full',
                      }"
                    >
                      <UInput v-model="storageConfigState.name" />
                    </UFormField>

                    <USeparator />

                    <AutoForm
                      id="createStorageForm"
                      :schema="currentStorageSchema"
                      :state="storageConfigState.config"
                      :fields-config="storageFieldsConfig"
                      @submit="onStorageConfigSubmit($event, close)"
                    >
                      <div
                        v-if="storageConfigState.provider === 'r2'"
                        class="space-y-3 pt-2"
                      >
                        <UButton
                          type="button"
                          icon="lucide:plug-zap"
                          color="neutral"
                          variant="outline"
                          :loading="testingR2"
                          @click="testR2Connection"
                        >
                          测试连接
                        </UButton>
                        <p
                          class="text-xs leading-5 text-neutral-500 dark:text-neutral-400"
                          aria-live="polite"
                        >
                          {{
                            r2Verified
                              ? '连接已验证。创建方案后仍需手动设为默认。'
                              : '建议先测试连接。上传会经过本站，无需配置 R2 跨域规则。切换默认存储不会迁移旧照片。'
                          }}
                        </p>
                      </div>
                    </AutoForm>
                  </div>
                </template>

                <template #footer="{ close }">
                  <UButton
                    label="取消"
                    color="neutral"
                    variant="outline"
                    @click="close"
                  />
                  <UButton
                    label="创建存储"
                    variant="soft"
                    icon="tabler:check"
                    type="submit"
                    form="createStorageForm"
                  />
                </template>
              </USlideover>
            </div>
          </header>
          <p
            class="border-b border-neutral-200 px-5 py-3 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
          >
            安装时创建的本地存储就是当前照片目录，可直接使用。只有要更换磁盘目录或接入
            S3、Cloudflare R2、OpenList 时，才需要添加新的存储方案。
          </p>

          <div
            v-if="availableStorageStatus !== 'success' && !availableStorage"
            class="space-y-3 px-5 py-5"
          >
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>

          <div
            v-else
            class="px-0 py-0"
          >
            <UTable
              :columns="availableStorageColumns"
              :data="availableStorage"
            />
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped></style>
