<script setup lang="ts">
import type {
  BackupFileSummary,
  BackupPreview,
  LumaAtlasBackupEnvelope,
} from '~~/shared/types/backup'

definePageMeta({ layout: 'dashboard' })
useHead({ title: $t('title.backup') })

const toast = useToast()
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const creating = ref(false)
const previewing = ref(false)
const restoring = ref(false)
const deletingFilename = ref('')
const selectedFilename = ref('')
const selectedBackup = ref<LumaAtlasBackupEnvelope | null>(null)
const preview = ref<BackupPreview | null>(null)
const restoreMode = ref<'merge' | 'replace'>('merge')
const replaceConfirmed = ref(false)

const { data: backups, refresh } = await useFetch<BackupFileSummary[]>(
  '/api/system/backups',
  { default: () => [] },
)

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const downloadBackup = (backup: LumaAtlasBackupEnvelope, filename: string) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const createManualBackup = async () => {
  creating.value = true
  try {
    const result = await $fetch<{
      backup: LumaAtlasBackupEnvelope
      file: BackupFileSummary
    }>('/api/system/backups', { method: 'POST' })
    downloadBackup(result.backup, result.file.filename)
    await refresh()
    toast.add({
      title: $t('backup.messages.created'),
      color: 'success',
      icon: 'lucide:check',
    })
  } catch (error) {
    toast.add({
      title: $t('backup.messages.createFailed'),
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    creating.value = false
  }
}

const selectBackupFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  previewing.value = true
  preview.value = null
  selectedBackup.value = null
  selectedFilename.value = file.name
  restoreMode.value = 'merge'
  replaceConfirmed.value = false

  try {
    const parsed = JSON.parse(await file.text()) as LumaAtlasBackupEnvelope
    const result = await $fetch<BackupPreview>('/api/system/backups/preview', {
      method: 'POST',
      body: parsed,
    })
    selectedBackup.value = parsed
    preview.value = result
  } catch (error) {
    selectedFilename.value = ''
    toast.add({
      title: $t('backup.messages.invalid'),
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    previewing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const restoreSelectedBackup = async () => {
  if (!selectedBackup.value) return
  if (restoreMode.value === 'replace' && !replaceConfirmed.value) return

  restoring.value = true
  try {
    await $fetch('/api/system/backups/restore', {
      method: 'POST',
      body: { mode: restoreMode.value, backup: selectedBackup.value },
    })
    await refresh()
    await refreshNuxtData()
    selectedBackup.value = null
    preview.value = null
    selectedFilename.value = ''
    toast.add({
      title: $t('backup.messages.restored'),
      description: $t('backup.messages.snapshotCreated'),
      color: 'success',
      icon: 'lucide:check',
    })
  } catch (error) {
    toast.add({
      title: $t('backup.messages.restoreFailed'),
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    restoring.value = false
  }
}

const deleteBackup = async (filename: string) => {
  if (!confirm($t('backup.history.deleteConfirm'))) return
  deletingFilename.value = filename
  try {
    await $fetch(`/api/system/backups/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    })
    await refresh()
  } finally {
    deletingFilename.value = ''
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.backup')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-7">
        <section
          class="border-b border-neutral-200 pb-5 dark:border-neutral-800"
        >
          <h2 class="text-xl font-semibold text-neutral-950 dark:text-white">
            {{ $t('backup.title') }}
          </h2>
          <p
            class="mt-2 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400"
          >
            {{ $t('backup.description') }}
          </p>
        </section>

        <section class="border border-neutral-200 dark:border-neutral-800">
          <header
            class="flex flex-col gap-4 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800"
          >
            <div>
              <h3 class="font-semibold text-neutral-950 dark:text-white">
                {{ $t('backup.export.title') }}
              </h3>
              <p class="mt-1 text-sm text-neutral-500">
                {{ $t('backup.export.description') }}
              </p>
            </div>
            <UButton
              icon="lucide:download"
              color="neutral"
              :loading="creating"
              @click="createManualBackup"
            >
              {{ $t('backup.export.action') }}
            </UButton>
          </header>
          <div
            class="grid gap-px bg-neutral-200 sm:grid-cols-4 dark:bg-neutral-800"
          >
            <div
              v-for="item in ['photos', 'albums', 'settings', 'security']"
              :key="item"
              class="bg-white px-5 py-4 dark:bg-neutral-950"
            >
              <Icon
                :name="
                  item === 'security'
                    ? 'lucide:shield-check'
                    : 'lucide:database'
                "
                class="size-4 text-neutral-400"
              />
              <p class="mt-2 text-sm font-medium">
                {{ $t(`backup.export.includes.${item}`) }}
              </p>
            </div>
          </div>
        </section>

        <section class="border border-neutral-200 dark:border-neutral-800">
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3 class="font-semibold text-neutral-950 dark:text-white">
              {{ $t('backup.restore.title') }}
            </h3>
            <p class="mt-1 text-sm text-neutral-500">
              {{ $t('backup.restore.description') }}
            </p>
          </header>

          <div class="space-y-5 px-5 py-5">
            <input
              ref="fileInput"
              type="file"
              accept="application/json,.json"
              class="hidden"
              @change="selectBackupFile"
            />
            <button
              type="button"
              class="flex min-h-28 w-full flex-col items-center justify-center gap-2 border border-dashed border-neutral-300 px-4 text-center transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
              @click="fileInput?.click()"
            >
              <Icon
                :name="previewing ? 'lucide:loader-circle' : 'lucide:file-up'"
                class="size-6 text-neutral-400"
                :class="previewing ? 'animate-spin' : ''"
              />
              <span class="text-sm font-medium">{{
                selectedFilename || $t('backup.restore.chooseFile')
              }}</span>
              <span class="text-xs text-neutral-500">{{
                $t('backup.restore.fileHint')
              }}</span>
            </button>

            <div
              v-if="preview"
              class="space-y-5 border-t border-neutral-200 pt-5 dark:border-neutral-800"
            >
              <div class="grid gap-3 sm:grid-cols-3">
                <div
                  class="border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <p class="text-xs text-neutral-500">
                    {{ $t('backup.preview.photos') }}
                  </p>
                  <p class="mt-1 text-lg font-semibold">
                    {{ preview.counts.photos }}
                  </p>
                  <p class="text-xs text-neutral-500">
                    {{
                      $t('backup.preview.conflicts', {
                        count: preview.conflicts.photos,
                      })
                    }}
                  </p>
                </div>
                <div
                  class="border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <p class="text-xs text-neutral-500">
                    {{ $t('backup.preview.albums') }}
                  </p>
                  <p class="mt-1 text-lg font-semibold">
                    {{ preview.counts.albums }}
                  </p>
                  <p class="text-xs text-neutral-500">
                    {{
                      $t('backup.preview.conflicts', {
                        count: preview.conflicts.albums,
                      })
                    }}
                  </p>
                </div>
                <div
                  class="border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <p class="text-xs text-neutral-500">
                    {{ $t('backup.preview.settings') }}
                  </p>
                  <p class="mt-1 text-lg font-semibold">
                    {{ preview.counts.settings }}
                  </p>
                  <p class="text-xs text-neutral-500">
                    {{
                      $t('backup.preview.conflicts', {
                        count: preview.conflicts.settings,
                      })
                    }}
                  </p>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="option in ['merge', 'replace'] as const"
                  :key="option"
                  type="button"
                  class="border px-4 py-3 text-left transition-colors"
                  :class="
                    restoreMode === option
                      ? 'border-neutral-950 bg-neutral-50 dark:border-white dark:bg-neutral-900'
                      : 'border-neutral-200 dark:border-neutral-800'
                  "
                  @click="restoreMode = option"
                >
                  <span class="text-sm font-semibold">{{
                    $t(`backup.restore.modes.${option}.label`)
                  }}</span>
                  <span class="mt-1 block text-xs leading-5 text-neutral-500">{{
                    $t(`backup.restore.modes.${option}.description`)
                  }}</span>
                </button>
              </div>

              <UCheckbox
                v-if="restoreMode === 'replace'"
                v-model="replaceConfirmed"
                :label="$t('backup.restore.replaceConfirm')"
              />

              <div class="flex justify-end">
                <UButton
                  icon="lucide:archive-restore"
                  color="neutral"
                  :loading="restoring"
                  :disabled="restoreMode === 'replace' && !replaceConfirmed"
                  @click="restoreSelectedBackup"
                >
                  {{ $t('backup.restore.action') }}
                </UButton>
              </div>
            </div>
          </div>
        </section>

        <section class="border border-neutral-200 dark:border-neutral-800">
          <header
            class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
          >
            <h3 class="font-semibold text-neutral-950 dark:text-white">
              {{ $t('backup.history.title') }}
            </h3>
            <p class="mt-1 text-sm text-neutral-500">
              {{ $t('backup.history.description') }}
            </p>
          </header>
          <div
            v-if="backups.length === 0"
            class="px-5 py-10 text-center text-sm text-neutral-500"
          >
            {{ $t('backup.history.empty') }}
          </div>
          <div
            v-else
            class="divide-y divide-neutral-200 dark:divide-neutral-800"
          >
            <div
              v-for="backup in backups"
              :key="backup.filename"
              class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate text-sm font-medium">
                    {{ backup.filename }}
                  </p>
                  <UBadge
                    color="neutral"
                    variant="outline"
                    size="sm"
                  >
                    {{ $t(`backup.history.reasons.${backup.reason}`) }}
                  </UBadge>
                </div>
                <p class="mt-1 text-xs text-neutral-500">
                  {{ new Date(backup.createdAt).toLocaleString() }} ·
                  {{ formatBytes(backup.bytes) }} · {{ backup.counts.photos }}
                  {{ $t('backup.preview.photos') }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <UButton
                  icon="lucide:download"
                  color="neutral"
                  variant="ghost"
                  :to="`/api/system/backups/${encodeURIComponent(backup.filename)}`"
                  target="_blank"
                  :aria-label="$t('backup.history.download')"
                />
                <UButton
                  icon="lucide:trash-2"
                  color="error"
                  variant="ghost"
                  :loading="deletingFilename === backup.filename"
                  :aria-label="$t('backup.history.delete')"
                  @click="deleteBackup(backup.filename)"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
