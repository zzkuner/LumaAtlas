<script lang="ts" setup>
import { isNil } from 'es-toolkit'

const props = withDefaults(
  defineProps<{
    title?: string
    value?: string | number
    icon?: string
    color?: keyof typeof colorSchemes
    clickable?: boolean
  }>(),
  {
    title: undefined,
    value: undefined,
    icon: undefined,
    color: 'blue',
    clickable: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const colorSchemes = {
  blue: {
    icon: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  purple: {
    icon: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  orange: {
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  red: {
    icon: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  gray: {
    icon: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
  },
  yellow: {
    icon: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
}

const currentScheme = computed(() => colorSchemes[props.color])
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    :class="[
      'flex min-h-28 w-full items-center gap-4 rounded-md border border-neutral-200 bg-white p-4 text-left dark:border-neutral-800 dark:bg-neutral-950',
      clickable
        ? 'cursor-pointer transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-neutral-900'
        : '',
    ]"
    @click="clickable ? emit('click') : undefined"
  >
    <div
      v-if="icon"
      class="flex size-10 shrink-0 items-center justify-center rounded-md"
      :class="currentScheme.icon"
    >
      <UIcon
        :name="icon"
        class="size-5"
      />
    </div>
    <div class="min-w-0 flex-1">
      <p
        v-if="title"
        class="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400"
      >
        {{ title }}
      </p>
      <p
        v-if="!isNil(value)"
        class="mt-1 truncate text-2xl font-semibold text-neutral-950 dark:text-white"
      >
        {{ value }}
      </p>
    </div>
    <UIcon
      v-if="clickable"
      name="lucide:chevron-right"
      class="size-4 shrink-0 text-neutral-400"
    />
  </component>
</template>

<style scoped></style>
