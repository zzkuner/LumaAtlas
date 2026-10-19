<script lang="ts" setup>
import { AnimatePresence, motion } from 'motion-v'

const props = defineProps<{
  dateRange?: string
  locations?: string
  isVisible: boolean
  isMobile?: boolean
  class?: string
}>()

const shouldShow = computed(() => {
  return props.isVisible && !!props.dateRange
})

const dateRangeVariants = {
  initial: {
    opacity: 0,
    x: -20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
}

const mobileVariants = {
  initial: {
    opacity: 0,
    y: -20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
}
</script>

<template>
  <div>
    <AnimatePresence>
      <!-- Desktop Date Range Indicator -->
      <motion.div
        v-if="shouldShow && !isMobile"
        class="fixed left-4 top-28 z-30 flex flex-col border border-neutral-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/90 lg:left-6"
        :initial="dateRangeVariants.initial"
        :animate="dateRangeVariants.animate"
        :exit="dateRangeVariants.initial"
        :transition="{
          type: 'spring',
          duration: 0.4,
          bounce: 0.15,
        }"
      >
        <span class="text-sm font-medium text-neutral-900 dark:text-white">
          {{ dateRange }}
        </span>
        <span
          v-if="locations"
          class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400"
        >
          {{ locations }}
        </span>
      </motion.div>

      <!-- Mobile Date Range Indicator -->
      <motion.div
        v-if="shouldShow && isMobile"
        class="fixed inset-x-0 top-40 z-30 flex justify-center px-3"
        :initial="mobileVariants.initial"
        :animate="mobileVariants.animate"
        :exit="mobileVariants.initial"
        :transition="{
          type: 'spring',
          duration: 0.3,
          bounce: 0.1,
        }"
      >
        <div
          class="flex max-w-full flex-col border border-neutral-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/90"
        >
          <span
            class="truncate text-sm font-medium text-neutral-900 dark:text-white"
          >
            {{ dateRange }}
          </span>
          <span
            v-if="locations"
            class="truncate text-xs text-neutral-500 dark:text-neutral-400"
          >
            {{ locations }}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<style scoped></style>
