<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: string
  }>(),
  {
    description: '',
    icon: 'lucide:panel-top',
  },
)
</script>

<template>
  <section
    class="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-start dark:border-neutral-800"
  >
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
    >
      <Icon
        :name="icon"
        class="size-5"
      />
    </span>
    <div class="min-w-0 flex-1">
      <h1 class="text-2xl font-semibold text-neutral-950 dark:text-white">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-1 max-w-3xl text-sm leading-6 text-neutral-500 dark:text-neutral-400"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="shrink-0"
    >
      <slot name="actions" />
    </div>
  </section>
</template>
