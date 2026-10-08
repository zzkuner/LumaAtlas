<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const variantClass = computed(() => {
  switch (attrs.variant) {
    case 'outline':
      return 'border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
    case 'ghost':
      return 'text-neutral-400 hover:bg-white/5 hover:text-white'
    default:
      return 'border border-white/10 bg-linear-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:from-primary-500 hover:to-primary-400 hover:shadow-primary-500/40'
  }
})
</script>

<template>
  <UButton
    v-bind="$attrs"
    :class="variantClass"
    :ui="{
      base: 'rounded-xl font-medium transition-all duration-300',
    }"
  >
    <template
      v-for="(_, name) in $slots"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData"
      />
    </template>
  </UButton>
</template>
