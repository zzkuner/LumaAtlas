<script setup lang="ts">
definePageMeta({ layout: false })

useHead({ title: () => $t('title.about') })

const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteLogo = computed(() =>
  String(getSetting('app:logoUrl') || '/favicon.ico'),
)
const author = computed(() => String(getSetting('app:author') || ''))
const avatarUrl = computed(() => String(getSetting('app:avatarUrl') || ''))
const slogan = computed(() => String(getSetting('app:slogan') || ''))
const description = computed(() => String(getSetting('app:description') || ''))
const aboutText = computed(() => String(getSetting('app:aboutText') || ''))

const socialLinks = computed(() => {
  const value = getSetting('app:appearance.home.socialLinks')
  const links =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const meta: Record<string, { label: string; icon: string }> = {
    website: { label: 'Website', icon: 'lucide:globe-2' },
    instagram: { label: 'Instagram', icon: 'simple-icons:instagram' },
    x: { label: 'X', icon: 'simple-icons:x' },
    github: { label: 'GitHub', icon: 'simple-icons:github' },
  }
  return Object.entries(links)
    .filter((entry): entry is [string, string] =>
      Boolean(typeof entry[1] === 'string' && entry[1]),
    )
    .map(([id, url]) => ({ id, url, ...(meta[id] || meta.website) }))
})
</script>

<template>
  <div
    class="min-h-svh bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <MasonryItemHeader
      :show-gallery-controls="false"
      :show-context="false"
    />

    <main class="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:px-8 sm:pt-24">
      <div class="flex flex-col items-start gap-8 sm:flex-row sm:gap-12">
        <img
          :src="siteLogo"
          :alt="siteTitle"
          class="size-24 shrink-0 object-contain sm:size-32"
        />
        <div class="min-w-0 flex-1">
          <p class="font-display text-sm text-neutral-500">
            {{ author || siteTitle }}
          </p>
          <h1 class="font-display mt-2 text-3xl font-semibold sm:text-4xl">
            {{ siteTitle }}
          </h1>
          <p
            v-if="slogan"
            class="font-display mt-3 text-lg text-neutral-600 dark:text-neutral-300"
          >
            {{ slogan }}
          </p>
        </div>
      </div>

      <div
        class="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800"
      >
        <div class="flex items-start gap-4">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="author || siteTitle"
            class="size-12 shrink-0 rounded-full object-cover"
          />
          <div class="min-w-0 space-y-5">
            <p
              v-if="description"
              class="font-display text-lg leading-8 text-neutral-700 dark:text-neutral-300"
            >
              {{ description }}
            </p>
            <p
              v-if="aboutText"
              class="whitespace-pre-line text-sm leading-7 text-neutral-600 dark:text-neutral-400"
            >
              {{ aboutText }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="socialLinks.length"
        class="mt-10 flex flex-wrap gap-2 border-t border-neutral-200 pt-6 dark:border-neutral-800"
      >
        <UButton
          v-for="link in socialLinks"
          :key="link.id"
          :to="link.url"
          target="_blank"
          :icon="link.icon"
          :label="link.label"
          color="neutral"
          variant="ghost"
        />
      </div>
    </main>
  </div>
</template>
