<script setup lang="ts">
import type {
  StorageImportEnqueueResult,
  StorageImportItemStatus,
  StorageImportScanResult,
} from '~~/shared/types/storage-import'

definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('title.storageImport'),
})

const toast = useToast()
const includeUnchanged = ref(false)
const isScanning = ref(false)
const isEnqueueing = ref(false)
const scanResult = ref<StorageImportScanResult | null>(null)

const statusColor: Record<
  StorageImportItemStatus,
  'success' | 'warning' | 'neutral' | 'info'
> = {
  new: 'success',
  updated: 'warning',
  unchanged: 'neutral',
  queued: 'info',
}

const formatFileSize = (size: number | null) => {
  if (size === null) return $t('storageImport.unknown')
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const scanStorage = async () => {
  isScanning.value = true
  try {
    scanResult.value = await $fetch<StorageImportScanResult>(
      '/api/import/storage/scan',
      {
        method: 'POST',
        body: {
          includeUnchanged: includeUnchanged.value,
          previewLimit: 200,
        },
      },
    )
  } catch (error) {
    toast.add({
      title: $t('storageImport.messages.scanFailed'),
      description: error instanceof Error ? error.message : String(error),
      color: 'error',
    })
  } finally {
    isScanning.value = false
  }
}

const enqueueImport = async () => {
  isEnqueueing.value = true
  try {
    const result = await $fetch<StorageImportEnqueueResult>(
      '/api/import/storage/enqueue',
      {
        method: 'POST',
        body: {
          includeUnchanged: includeUnchanged.value,
          batchSize: 500,
        },
      },
    )

    toast.add({
      title: $t('storageImport.messages.enqueued'),
      description: $t('storageImport.messages.enqueuedDescription', {
        count: result.enqueuedCount,
        remaining: result.remainingCount,
      }),
      color: result.failedCount > 0 ? 'warning' : 'success',
    })
    await scanStorage()
  } catch (error) {
    toast.add({
      title: $t('storageImport.messages.enqueueFailed'),
      description: error instanceof Error ? error.message : String(error),
      color: 'error',
    })
  } finally {
    isEnqueueing.value = false
  }
}

watch(includeUnchanged, () => {
  scanResult.value = null
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.storageImport')">
        <template #right>
          <UButton
            to="/dashboard/queue"
            color="neutral"
            variant="ghost"
            icon="lucide:list-checks"
          >
            {{ $t('storageImport.actions.openQueue') }}
          </UButton>
          <UButton
            icon="lucide:scan-search"
            :loading="isScanning"
            @click="scanStorage"
          >
            {{ $t('storageImport.actions.scan') }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-6xl space-y-6">
        <section
          class="space-y-2 border-b border-neutral-200 pb-5 dark:border-neutral-800"
        >
          <h2 class="text-xl font-semibold text-neutral-950 dark:text-white">
            {{ $t('storageImport.heading') }}
          </h2>
          <p
            class="max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400"
          >
            {{ $t('storageImport.description') }}
          </p>
        </section>

        <section
          class="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800"
        >
          <div>
            <p
              class="text-sm font-medium text-neutral-900 dark:text-neutral-100"
            >
              {{ $t('storageImport.force.label') }}
            </p>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {{ $t('storageImport.force.description') }}
            </p>
          </div>
          <USwitch v-model="includeUnchanged" />
        </section>

        <section
          v-if="!scanResult"
          class="flex min-h-72 flex-col items-center justify-center gap-4 border border-dashed border-neutral-300 px-6 text-center dark:border-neutral-700"
        >
          <Icon
            name="lucide:folder-search-2"
            class="size-9 text-neutral-400"
          />
          <div class="space-y-1">
            <p class="font-medium text-neutral-900 dark:text-neutral-100">
              {{ $t('storageImport.empty.title') }}
            </p>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ $t('storageImport.empty.description') }}
            </p>
          </div>
          <UButton
            icon="lucide:scan-search"
            :loading="isScanning"
            @click="scanStorage"
          >
            {{ $t('storageImport.actions.scan') }}
          </UButton>
        </section>

        <template v-else>
          <section
            class="overflow-hidden border border-neutral-200 dark:border-neutral-800"
          >
            <div
              class="grid grid-cols-2 divide-x divide-y divide-neutral-200 sm:grid-cols-3 lg:grid-cols-6 dark:divide-neutral-800"
            >
              <div
                v-for="item in [
                  ['total', scanResult.summary.total],
                  ['new', scanResult.summary.new],
                  ['updated', scanResult.summary.updated],
                  ['queued', scanResult.summary.queued],
                  ['unchanged', scanResult.summary.unchanged],
                  ['missing', scanResult.summary.missing],
                ]"
                :key="String(item[0])"
                class="px-4 py-4"
              >
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ $t(`storageImport.summary.${item[0]}`) }}
                </p>
                <p
                  class="mt-1 text-2xl font-semibold tabular-nums text-neutral-950 dark:text-white"
                >
                  {{ item[1] }}
                </p>
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <h3
                  class="text-base font-semibold text-neutral-950 dark:text-white"
                >
                  {{ $t('storageImport.preview.title') }}
                </h3>
                <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {{
                    $t('storageImport.preview.description', {
                      provider:
                        scanResult.provider || $t('storageImport.unknown'),
                      count: scanResult.summary.importable,
                    })
                  }}
                </p>
              </div>
              <UButton
                icon="lucide:play"
                :disabled="scanResult.summary.importable === 0"
                :loading="isEnqueueing"
                @click="enqueueImport"
              >
                {{ $t('storageImport.actions.enqueue') }}
              </UButton>
            </div>

            <div
              class="overflow-hidden border border-neutral-200 dark:border-neutral-800"
            >
              <div
                v-if="scanResult.items.length === 0"
                class="px-5 py-10 text-center text-sm text-neutral-500"
              >
                {{ $t('storageImport.preview.noFiles') }}
              </div>
              <template v-else>
                <div
                  v-for="item in scanResult.items"
                  :key="item.key"
                  class="flex min-h-14 items-center gap-3 border-b border-neutral-200 px-4 py-3 last:border-b-0 dark:border-neutral-800"
                >
                  <Icon
                    name="lucide:image"
                    class="size-4 shrink-0 text-neutral-400"
                  />
                  <div class="min-w-0 flex-1">
                    <p
                      class="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100"
                    >
                      {{ item.key }}
                    </p>
                    <p
                      class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400"
                    >
                      {{ formatFileSize(item.size) }}
                      <span v-if="item.lastModified">
                        &middot;
                        {{ new Date(item.lastModified).toLocaleString() }}
                      </span>
                    </p>
                  </div>
                  <UBadge
                    :color="statusColor[item.status]"
                    variant="subtle"
                  >
                    {{ $t(`storageImport.status.${item.status}`) }}
                  </UBadge>
                </div>
              </template>
            </div>
            <p
              v-if="scanResult.hasMoreItems"
              class="text-xs text-neutral-500 dark:text-neutral-400"
            >
              {{
                $t('storageImport.preview.truncated', {
                  count: scanResult.previewLimit,
                })
              }}
            </p>
          </section>

          <section
            v-if="scanResult.summary.missing > 0"
            class="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800"
          >
            <div class="flex items-start gap-3">
              <Icon
                name="lucide:triangle-alert"
                class="mt-0.5 size-5 shrink-0 text-amber-500"
              />
              <div>
                <h3
                  class="text-base font-semibold text-neutral-950 dark:text-white"
                >
                  {{ $t('storageImport.missing.title') }}
                </h3>
                <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {{ $t('storageImport.missing.description') }}
                </p>
              </div>
            </div>
            <div class="border border-neutral-200 dark:border-neutral-800">
              <div
                v-for="item in scanResult.missingItems"
                :key="item.photoId"
                class="border-b border-neutral-200 px-4 py-3 text-sm last:border-b-0 dark:border-neutral-800"
              >
                <p class="font-medium text-neutral-900 dark:text-neutral-100">
                  {{ item.title || item.photoId }}
                </p>
                <p class="mt-0.5 truncate text-xs text-neutral-500">
                  {{ item.key }}
                </p>
              </div>
            </div>
          </section>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
