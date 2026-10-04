<script lang="ts" setup>
export interface KVData {
  title: string
  items: ({
    label: string
    value?: string | number | null
    icon?: string | 'placeholder'
  } | null)[]
}

defineProps<{
  data: KVData[]
}>()
</script>

<template>
  <template
    v-for="(section, index) in data"
    :key="index"
  >
    <div
      v-if="section.items.some((item) => item?.value)"
      class="space-y-3"
    >
      <h4
        class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400"
      >
        {{ section.title }}
      </h4>

      <div class="space-y-2">
        <div
          v-for="(item, itemIdx) in section.items.filter(Boolean)"
          :key="itemIdx"
          class="flex items-start gap-1 text-xs"
        >
          <div
            v-if="item!.icon === 'placeholder'"
            class="size-4 -mt-[1px]"
          />
          <Icon
            v-else-if="item!.icon"
            :name="item!.icon"
            class="-mt-px size-4 flex-shrink-0 text-neutral-400 dark:text-neutral-500"
          />
          <div
            class="flex-1 min-w-0 flex gap-6 items-start justify-between font-medium"
          >
            <div class="text-nowrap text-neutral-500 dark:text-neutral-400">
              {{ item!.label }}
            </div>
            <div
              class="text-wrap wrap-anywhere text-end font-medium whitespace-pre-line text-neutral-900 dark:text-neutral-100"
            >
              {{ item!.value }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped></style>
