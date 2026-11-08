<script lang="ts" setup>
useHead({
  title: '',
})

const { photos } = usePhotos()
const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteLogo = computed(() => String(getSetting('app:logoUrl') || ''))
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
            <img
              v-if="siteLogo"
              :src="siteLogo"
              :alt="siteTitle"
              class="size-12 rounded-full object-contain"
            />
            <span
              v-else
              class="flex size-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900"
            >
              <Icon
                name="lucide:aperture"
                class="size-7 animate-spin text-neutral-500"
              />
            </span>
            <span
              class="font-brand text-xl font-medium text-neutral-600 dark:text-neutral-300"
              >{{ siteTitle }}</span
            >
          </div>
        </template>
      </ClientOnly>
      <slot />
    </div>
  </div>
</template>
