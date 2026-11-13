<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')

definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('dashboard.queue.title'),
})

const toast = useToast()

// 状态管理
const isLoading = ref(false)
const isDeleting = ref(false)
const isClearConfirmOpen = ref(false)
const includeCompleted = ref(true)
const includeFailed = ref(false)
const deleteTargetTaskId = ref<number | null>(null)
const statusFilter = ref<string>('all')
const typeFilter = ref<string>('all')
const page = ref(1)
watch([statusFilter, typeFilter], () => {
  page.value = 1
})

// 数据获取
const { data: queueData, refresh: refreshQueue } = await useFetch(
  '/api/queue/task/list',
  {
    query: computed(() => ({
      ...(statusFilter.value !== 'all' && { status: statusFilter.value }),
      ...(typeFilter.value !== 'all' && { type: typeFilter.value }),
      page: page.value,
      limit: 30,
    })),
  },
)

// 队列统计数据
const queueStats = computed(
  () =>
    queueData.value?.stats || {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    },
)
const clearCount = computed(
  () =>
    (includeCompleted.value ? queueStats.value.completed : 0) +
    (includeFailed.value ? queueStats.value.failed : 0),
)
const openClearConfirmation = () => {
  includeCompleted.value = true
  includeFailed.value = false
  isClearConfirmOpen.value = true
}

// 刷新数据
const refreshData = async () => {
  isLoading.value = true
  try {
    await refreshQueue()
  } finally {
    isLoading.value = false
  }
}

// 清理非活跃任务
const clearNonActiveTasks = async () => {
  if (clearCount.value === 0) return
  try {
    isLoading.value = true
    const result = await $fetch('/api/queue/task/clear', {
      method: 'DELETE',
      query: {
        includeCompleted: String(includeCompleted.value),
        includeFailed: String(includeFailed.value),
      },
    })

    toast.add({
      title: $t('dashboard.queue.messages.clearSuccess'),
      description: `清除了 ${result.deletedCount} 个任务`,
      color: 'success',
    })

    isClearConfirmOpen.value = false
    page.value = 1
    await refreshData()
  } catch (error: any) {
    console.error('Clear tasks failed:', error)
    toast.add({
      title: $t('dashboard.queue.messages.operationFailed'),
      description: error?.message || '清理任务失败',
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

// 重试单个任务
const retryTask = async (taskId: number) => {
  try {
    await $fetch('/api/queue/task/retry', {
      method: 'POST',
      body: { taskId },
    })

    toast.add({
      title: $t('dashboard.queue.messages.retrySuccess'),
      color: 'success',
    })

    await refreshData()
  } catch (error: any) {
    console.error('Retry task failed:', error)
    toast.add({
      title: $t('dashboard.queue.messages.operationFailed'),
      description: error?.message || '重试任务失败',
      color: 'error',
    })
  }
}

// 批量重试失败任务
const retryAllFailedTasks = async () => {
  try {
    isLoading.value = true
    const result = await $fetch('/api/queue/task/retry-batch', {
      method: 'POST',
      body: { retryAll: true },
    })

    toast.add({
      title: $t('dashboard.queue.messages.batchRetrySuccess'),
      description: `重试了 ${result.retriedCount} 个任务`,
      color: 'success',
    })

    await refreshData()
  } catch (error: any) {
    console.error('Batch retry failed:', error)
    toast.add({
      title: $t('dashboard.queue.messages.operationFailed'),
      description: error?.message || '批量重试失败',
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

// 删除单个任务（仅适用于失败任务）
const deleteTask = async (taskId: number) => {
  try {
    isDeleting.value = true
    await $fetch(`/api/queue/failed/${taskId}`, {
      method: 'DELETE',
    })

    toast.add({
      title: $t('dashboard.queue.messages.deleteSuccess'),
      color: 'success',
    })

    deleteTargetTaskId.value = null
    page.value = 1
    await refreshData()
  } catch (error: any) {
    console.error('Delete task failed:', error)
    toast.add({
      title: $t('dashboard.queue.messages.operationFailed'),
      description: error?.message || '删除任务失败',
      color: 'error',
    })
  } finally {
    isDeleting.value = false
  }
}

// 获取状态颜色
const getStatusColor = (
  status: 'pending' | 'in-stages' | 'completed' | 'failed',
) => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'in-stages':
      return 'info'
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'neutral'
  }
}

// 状态选项
const statusOptions = [
  { label: $t('dashboard.queue.filters.all'), value: 'all' },
  { label: $t('dashboard.queue.status.pending'), value: 'pending' },
  { label: $t('dashboard.queue.status.in-stages'), value: 'in-stages' },
  { label: $t('dashboard.queue.status.completed'), value: 'completed' },
  { label: $t('dashboard.queue.status.failed'), value: 'failed' },
]

// 类型选项
const typeOptions = [
  { label: $t('dashboard.queue.filters.all'), value: 'all' },
  { label: $t('dashboard.queue.types.photo'), value: 'photo' },
  {
    label: $t('dashboard.queue.types.live-photo-video'),
    value: 'live-photo-video',
  },
  {
    label: $t('dashboard.queue.types.photo-reverse-geocoding'),
    value: 'photo-reverse-geocoding',
  },
  {
    label: $t('dashboard.queue.types.photo-erase-location'),
    value: 'photo-erase-location',
  },
]

// 展开行状态
const expanded = ref<Record<string, boolean>>({})
const mobileExpanded = ref<Record<number, boolean>>({})

const toggleMobileTask = (taskId: number) => {
  mobileExpanded.value[taskId] = !mobileExpanded.value[taskId]
}

const mobileActions = computed(() => [
  {
    label: $t('dashboard.queue.actions.refresh'),
    icon: 'tabler:refresh',
    onSelect: (): void => {
      void refreshData()
    },
  },
  {
    label: $t('dashboard.queue.actions.retryAll'),
    icon: 'tabler:repeat',
    color: 'warning' as const,
    disabled: queueStats.value.failed === 0 || isLoading.value,
    onSelect: (): void => {
      void retryAllFailedTasks()
    },
  },
  {
    label: $t('dashboard.queue.actions.clearNonActive'),
    icon: 'tabler:trash',
    color: 'error' as const,
    disabled:
      queueStats.value.completed + queueStats.value.failed === 0 ||
      isLoading.value,
    onSelect: (): void => {
      openClearConfirmation()
    },
  },
])

// 表格列定义
const columns: TableColumn<any>[] = [
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'tabler:chevron-down',
        square: true,
        'aria-label': 'Expand',
        ui: {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : '',
          ],
        },
        onClick: () => row.toggleExpanded(),
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: $t('dashboard.queue.table.id'),
  },
  {
    id: 'type',
    accessorFn: (row) => row.payload.type,
    header: $t('dashboard.queue.table.type'),
  },
  {
    accessorKey: 'status',
    header: $t('dashboard.queue.table.status'),
  },
  {
    accessorKey: 'attempts',
    header: $t('dashboard.queue.table.attempts'),
  },
  {
    accessorKey: 'priority',
    header: $t('dashboard.queue.table.priority'),
  },
  {
    accessorKey: 'statusStage',
    header: $t('dashboard.queue.table.stage'),
  },
  {
    accessorKey: 'createdAt',
    header: $t('dashboard.queue.table.createdAt'),
  },
  {
    id: 'actions',
    header: $t('dashboard.queue.table.actions'),
  },
]

// 自动刷新
let refreshInterval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && !isLoading.value)
      refreshQueue()
  }, 30000)
})
onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <UDashboardPanel class="min-w-0 overflow-hidden">
    <template #header>
      <UDashboardNavbar :title="$t('dashboard.queue.title')">
        <template #right>
          <div class="hidden items-center gap-2 lg:flex">
            <UButton
              icon="tabler:refresh"
              variant="soft"
              :loading="isLoading"
              @click="refreshData"
            >
              {{ $t('dashboard.queue.actions.refresh') }}
            </UButton>
            <UButton
              icon="tabler:refresh"
              color="warning"
              variant="soft"
              :loading="isLoading"
              :disabled="queueStats.failed === 0"
              @click="retryAllFailedTasks"
            >
              {{ $t('dashboard.queue.actions.retryAll') }}
            </UButton>
            <UButton
              icon="tabler:trash"
              color="neutral"
              variant="outline"
              :loading="isLoading"
              :disabled="queueStats.completed + queueStats.failed === 0"
              @click="openClearConfirmation"
            >
              {{ $t('dashboard.queue.actions.clearNonActive') }}
            </UButton>
          </div>

          <UDropdownMenu
            :items="mobileActions"
            :content="{ align: 'end' }"
            class="lg:hidden"
          >
            <UButton
              icon="lucide:ellipsis"
              color="neutral"
              variant="ghost"
              square
              :loading="isLoading"
              aria-label="任务操作"
            />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex min-w-0 flex-col gap-6">
        <!-- 状态指示器 -->
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <DashboardIndicator
            :title="$t('dashboard.queue.indicator.pending')"
            icon="tabler:clock"
            color="orange"
            :value="queueStats.pending"
          />
          <DashboardIndicator
            :title="$t('dashboard.queue.indicator.processing')"
            icon="tabler:loader"
            color="blue"
            :value="queueStats.processing"
          />
          <DashboardIndicator
            :title="$t('dashboard.queue.indicator.completed')"
            icon="tabler:check"
            color="green"
            :value="queueStats.completed"
          />
          <DashboardIndicator
            :title="$t('dashboard.queue.indicator.failed')"
            icon="tabler:alert-triangle"
            color="red"
            :value="queueStats.failed"
          />
        </div>

        <!-- 筛选器和表格 -->
        <UCard class="min-w-0 overflow-hidden">
          <template #header>
            <div
              class="flex flex-col gap-3 pb-2 lg:flex-row lg:items-center lg:justify-between"
            >
              <h2 class="text-base font-semibold sm:text-lg">
                队列任务
                <span class="ml-1 font-normal text-sm text-muted"
                  >{{ queueData?.total ?? 0 }} 条</span
                >
              </h2>
              <div
                class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto"
              >
                <div class="min-w-0">
                  <p class="mb-1 text-xs text-muted">状态</p>
                  <USelectMenu
                    v-model="statusFilter"
                    :items="statusOptions"
                    value-key="value"
                    size="sm"
                    variant="soft"
                    class="w-full lg:w-36"
                    :search-input="false"
                    aria-label="按状态筛选任务"
                  />
                </div>
                <div class="min-w-0">
                  <p class="mb-1 text-xs text-muted">类型</p>
                  <USelectMenu
                    v-model="typeFilter"
                    :items="typeOptions"
                    value-key="value"
                    size="sm"
                    variant="soft"
                    class="w-full lg:w-44"
                    :search-input="false"
                    aria-label="按类型筛选任务"
                  />
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 桌面端任务表格 -->
            <UTable
              v-model:expanded="expanded"
              :data="queueData?.data || []"
              :columns="columns"
              :loading="isLoading"
              :empty-state="{
                icon: 'tabler:inbox',
                label: $t('dashboard.queue.messages.noTasks'),
              }"
              class="hidden w-full overflow-x-auto lg:block"
            >
              <!-- 任务类型 -->
              <template #type-cell="{ row }">
                <UBadge
                  :label="
                    $t(`dashboard.queue.types.${row.original.payload.type}`)
                  "
                  variant="soft"
                  :color="
                    row.original.payload.type === 'photo' ? 'info' : 'secondary'
                  "
                  size="sm"
                />
              </template>

              <!-- 状态 -->
              <template #status-cell="{ row }">
                <UBadge
                  :label="$t(`dashboard.queue.status.${row.original.status}`)"
                  variant="soft"
                  :color="getStatusColor(row.original.status)"
                  size="sm"
                />
              </template>

              <!-- 尝试次数 -->
              <template #attempts-cell="{ row }">
                <span class="text-sm">
                  {{ row.original.attempts }}/{{ row.original.maxAttempts }}
                </span>
              </template>

              <!-- 处理阶段 -->
              <template #statusStage-cell="{ row }">
                <span
                  v-if="row.original.statusStage"
                  class="text-xs text-gray-500"
                >
                  {{ $t(`dashboard.queue.stages.${row.original.statusStage}`) }}
                </span>
                <span
                  v-else
                  class="text-xs text-gray-400"
                  >-</span
                >
              </template>

              <!-- 创建时间 -->
              <template #createdAt-cell="{ row }">
                <span class="text-sm">{{
                  $dayjs(row.original.createdAt).format('MM-DD HH:mm:ss')
                }}</span>
              </template>

              <!-- 操作按钮 -->
              <template #actions-cell="{ row }">
                <div class="flex items-center gap-1">
                  <UButton
                    v-if="row.original.status === 'failed'"
                    icon="tabler:refresh"
                    size="xs"
                    variant="soft"
                    color="warning"
                    @click="retryTask(row.original.id)"
                  >
                    {{ $t('dashboard.queue.buttons.retry') }}
                  </UButton>
                  <UButton
                    v-if="row.original.status === 'failed'"
                    icon="tabler:trash"
                    size="xs"
                    variant="soft"
                    color="error"
                    @click="deleteTargetTaskId = row.original.id"
                  >
                    {{ $t('dashboard.queue.buttons.delete') }}
                  </UButton>
                  <span
                    v-if="
                      row.original.status === 'pending' ||
                      row.original.status === 'in-stages'
                    "
                    class="text-xs text-gray-400"
                  >
                    -
                  </span>
                </div>
              </template>

              <!-- 展开行内容 -->
              <template #expanded="{ row }">
                <div class="px-2">
                  <div class="space-y-3">
                    <!-- 任务ID和类型 -->
                    <div class="flex gap-4">
                      <div>
                        <p class="text-xs text-neutral-500">PhotoId</p>
                        <p class="text-sm capitalize">
                          {{ row.original.payload.photoId || '-' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-neutral-500">
                          {{ $t('dashboard.queue.table.id') }}
                        </p>
                        <p class="font-mono text-sm">{{ row.original.id }}</p>
                      </div>
                      <div>
                        <p class="text-xs text-neutral-500">
                          {{ $t('dashboard.queue.table.type') }}
                        </p>
                        <p class="text-sm capitalize">
                          {{ row.original.payload.type }}
                        </p>
                      </div>
                    </div>

                    <!-- 错误信息（仅在失败状态显示） -->
                    <div
                      v-if="
                        row.original.status === 'failed' &&
                        row.original.errorMessage
                      "
                      class="mt-3"
                    >
                      <p class="text-xs text-neutral-500 mb-1">
                        {{ $t('dashboard.queue.table.errorMessage') }}
                      </p>
                      <div
                        class="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-100 dark:border-red-900/30"
                      >
                        <p
                          class="text-sm text-red-700 dark:text-red-300 wrap-break-word font-mono"
                        >
                          {{ row.original.errorMessage }}
                        </p>
                      </div>
                    </div>

                    <!-- Payload 信息 -->
                    <div
                      v-if="row.original.payload"
                      class="mt-3"
                    >
                      <p class="text-xs text-gray-500 mb-1">Payload</p>
                      <pre
                        class="text-xs bg-neutral-100/50 dark:bg-neutral-800/50 p-2 rounded overflow-x-auto text-neutral-700 dark:text-neutral-300"
                        >{{
                          JSON.stringify(row.original.payload, null, 2)
                        }}</pre
                      >
                    </div>
                  </div>
                </div>
              </template>
            </UTable>

            <!-- 手机端任务卡片 -->
            <div class="space-y-3 lg:hidden">
              <div
                v-if="isLoading && !queueData?.data?.length"
                class="flex min-h-32 items-center justify-center text-sm text-muted"
              >
                <UIcon
                  name="tabler:loader-2"
                  class="mr-2 size-5 animate-spin"
                />
                {{ $t('dashboard.queue.actions.refresh') }}
              </div>

              <div
                v-else-if="!queueData?.data?.length"
                class="flex min-h-32 flex-col items-center justify-center gap-2 text-sm text-muted"
              >
                <UIcon
                  name="tabler:inbox"
                  class="size-7"
                />
                {{ $t('dashboard.queue.messages.noTasks') }}
              </div>

              <article
                v-for="task in queueData?.data || []"
                :key="task.id"
                class="rounded-md border border-default bg-default p-3"
              >
                <div class="flex min-w-0 items-start justify-between gap-3">
                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <span class="font-mono text-xs text-muted"
                      >#{{ task.id }}</span
                    >
                    <UBadge
                      :label="$t(`dashboard.queue.types.${task.payload.type}`)"
                      variant="soft"
                      :color="
                        task.payload.type === 'photo' ? 'info' : 'secondary'
                      "
                      size="sm"
                    />
                    <UBadge
                      :label="$t(`dashboard.queue.status.${task.status}`)"
                      variant="soft"
                      :color="getStatusColor(task.status)"
                      size="sm"
                    />
                  </div>

                  <UButton
                    :icon="
                      mobileExpanded[task.id]
                        ? 'tabler:chevron-up'
                        : 'tabler:chevron-down'
                    "
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    :aria-label="
                      mobileExpanded[task.id] ? '收起任务' : '展开任务'
                    "
                    @click="toggleMobileTask(task.id)"
                  />
                </div>

                <dl
                  class="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 text-sm min-[360px]:grid-cols-2"
                >
                  <div class="min-w-0">
                    <dt class="text-xs text-muted">
                      {{ $t('dashboard.queue.table.attempts') }}
                    </dt>
                    <dd>{{ task.attempts }}/{{ task.maxAttempts }}</dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-muted">
                      {{ $t('dashboard.queue.table.priority') }}
                    </dt>
                    <dd>{{ task.priority }}</dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-muted">
                      {{ $t('dashboard.queue.table.stage') }}
                    </dt>
                    <dd class="truncate">
                      {{
                        task.statusStage
                          ? $t(`dashboard.queue.stages.${task.statusStage}`)
                          : '-'
                      }}
                    </dd>
                  </div>
                  <div class="min-w-0">
                    <dt class="text-xs text-muted">
                      {{ $t('dashboard.queue.table.createdAt') }}
                    </dt>
                    <dd class="whitespace-nowrap">
                      {{ $dayjs(task.createdAt).format('MM-DD HH:mm:ss') }}
                    </dd>
                  </div>
                </dl>

                <div
                  v-if="task.status === 'failed'"
                  class="mt-3 flex flex-wrap gap-2 border-t border-default pt-3"
                >
                  <UButton
                    icon="tabler:refresh"
                    size="xs"
                    variant="soft"
                    color="warning"
                    @click="retryTask(task.id)"
                  >
                    {{ $t('dashboard.queue.buttons.retry') }}
                  </UButton>
                  <UButton
                    icon="tabler:trash"
                    size="xs"
                    variant="soft"
                    color="error"
                    @click="deleteTargetTaskId = task.id"
                  >
                    {{ $t('dashboard.queue.buttons.delete') }}
                  </UButton>
                </div>

                <div
                  v-if="mobileExpanded[task.id]"
                  class="mt-3 space-y-3 border-t border-default pt-3"
                >
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="min-w-0">
                      <p class="text-xs text-muted">PhotoId</p>
                      <p class="truncate">
                        {{
                          'photoId' in task.payload
                            ? task.payload.photoId || '-'
                            : '-'
                        }}
                      </p>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-muted">
                        {{ $t('dashboard.queue.table.type') }}
                      </p>
                      <p class="break-words">{{ task.payload.type }}</p>
                    </div>
                  </div>

                  <div v-if="task.status === 'failed' && task.errorMessage">
                    <p class="mb-1 text-xs text-muted">
                      {{ $t('dashboard.queue.table.errorMessage') }}
                    </p>
                    <p
                      class="break-words rounded-md border border-error/20 bg-error/5 p-2 font-mono text-xs text-error"
                    >
                      {{ task.errorMessage }}
                    </p>
                  </div>

                  <div>
                    <p class="mb-1 text-xs text-muted">Payload</p>
                    <pre
                      class="max-w-full overflow-x-auto rounded-md bg-elevated p-2 text-xs"
                      >{{ JSON.stringify(task.payload, null, 2) }}</pre
                    >
                  </div>
                </div>
              </article>
            </div>
            <div
              v-if="(queueData?.totalPages ?? 0) > 1"
              class="flex items-center justify-end gap-3 pt-2"
            >
              <UButton
                icon="lucide:chevron-left"
                color="neutral"
                variant="ghost"
                square
                :disabled="page <= 1"
                aria-label="上一页"
                @click="page--"
              />
              <span class="text-sm text-muted"
                >{{ page }} / {{ queueData?.totalPages }}</span
              >
              <UButton
                icon="lucide:chevron-right"
                color="neutral"
                variant="ghost"
                square
                :disabled="page >= (queueData?.totalPages ?? 0)"
                aria-label="下一页"
                @click="page++"
              />
            </div>
          </div>
        </UCard>
      </div>

      <UModal v-model:open="isClearConfirmOpen">
        <template #body>
          <div class="space-y-4">
            <div>
              <h2 class="text-lg font-semibold">清理任务记录</h2>
              <p class="mt-1 text-sm text-muted">
                将清理全队列中所选状态的任务记录，不受当前列表筛选影响；照片不会删除。清理后无法找回处理记录和错误详情。
              </p>
            </div>
            <div class="space-y-3 rounded-md border border-default p-4">
              <UCheckbox
                v-model="includeCompleted"
                :label="`已完成 (${queueStats.completed})`"
                :disabled="queueStats.completed === 0 || isLoading"
              />
              <UCheckbox
                v-model="includeFailed"
                :label="`失败记录 (${queueStats.failed})`"
                :disabled="queueStats.failed === 0 || isLoading"
              />
            </div>
            <p
              v-if="includeFailed"
              class="text-sm text-error"
            >
              失败记录包含排查问题所需的错误信息，建议先确认已不再需要。
            </p>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isLoading"
              @click="isClearConfirmOpen = false"
              >取消</UButton
            >
            <UButton
              color="error"
              icon="lucide:trash-2"
              :loading="isLoading"
              :disabled="clearCount === 0"
              @click="clearNonActiveTasks"
            >
              清理 {{ clearCount }} 条
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        :open="deleteTargetTaskId !== null"
        @update:open="
          (open) => {
            if (!open) deleteTargetTaskId = null
          }
        "
      >
        <template #body>
          <div>
            <h2 class="text-lg font-semibold">
              删除失败任务 #{{ deleteTargetTaskId }}
            </h2>
            <p class="mt-2 text-sm text-muted">
              该任务的错误记录将永久删除，照片不会受影响。
            </p>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isDeleting"
              @click="deleteTargetTaskId = null"
              >取消</UButton
            >
            <UButton
              color="error"
              icon="lucide:trash-2"
              :loading="isDeleting"
              :disabled="deleteTargetTaskId === null"
              @click="
                deleteTargetTaskId !== null && deleteTask(deleteTargetTaskId)
              "
              >删除任务</UButton
            >
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
