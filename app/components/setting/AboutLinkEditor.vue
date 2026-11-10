<script setup lang="ts">
import type { AboutLinkId, AboutLinkSetting } from '~~/shared/utils/about-links'

defineProps<{
  id: AboutLinkId
  label: string
  icon: string
  value: AboutLinkSetting
}>()

const emit = defineEmits<{
  change: [id: AboutLinkId, changes: Partial<AboutLinkSetting>]
}>()
</script>

<template>
  <div
    class="border-b border-neutral-200 py-4 last:border-b-0 dark:border-neutral-800"
  >
    <div class="flex items-center justify-between gap-4">
      <span class="inline-flex items-center gap-2 text-sm font-medium">
        <Icon
          :name="icon"
          class="size-4"
        />
        {{ label }}
      </span>
      <label
        class="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
      >
        显示
        <USwitch
          :disabled="!value.url"
          :model-value="value.enabled"
          @update:model-value="emit('change', id, { enabled: $event })"
        />
      </label>
    </div>
    <div class="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <UFormField label="显示名称">
        <UInput
          class="w-full"
          :model-value="value.label"
          @update:model-value="emit('change', id, { label: String($event) })"
        />
      </UFormField>
      <UFormField label="链接地址">
        <UInput
          class="w-full"
          type="url"
          placeholder="https://"
          :model-value="value.url"
          @update:model-value="emit('change', id, { url: String($event) })"
        />
      </UFormField>
    </div>
  </div>
</template>
