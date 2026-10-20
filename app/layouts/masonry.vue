<script lang="ts" setup>
useHead({
  title: '',
})

const { photos } = usePhotos()
</script>

<template>
  <div class="relative min-h-screen bg-white dark:bg-neutral-950">
    <div class="min-h-svh">
      <ClientOnly>
        <MasonryRoot
          :photos="photos"
          columns="auto"
        />
        <template #fallback>
          <div
            class="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-950"
          >
            <span
              class="flex size-9 items-center justify-center border border-neutral-300 dark:border-neutral-700"
            >
              <Icon
                name="lucide:aperture"
                class="size-5 animate-spin text-neutral-500"
              />
            </span>
            <span class="font-brand text-base font-semibold text-neutral-500"
              >LumaAtlas</span
            >
          </div>
        </template>
      </ClientOnly>
      <slot />
    </div>
  </div>
</template>
