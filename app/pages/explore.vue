<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
await navigateTo(
  {
    path: '/',
    query: route.query,
  },
  { replace: true },
)
</script>

<template>
  <div />
</template>
