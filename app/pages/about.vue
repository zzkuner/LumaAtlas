<script setup lang="ts">
definePageMeta({ layout: false })

if (getSetting('app:appearance.home.showAboutNav') !== true) {
  await navigateTo('/', { replace: true })
}

useHead({ title: () => $t('title.about') })

const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const author = computed(() => String(getSetting('app:author') || ''))
const avatarUrl = computed(() => String(getSetting('app:avatarUrl') || ''))
const slogan = computed(() => String(getSetting('app:slogan') || ''))
const description = computed(() => String(getSetting('app:description') || ''))
const aboutText = computed(() => String(getSetting('app:aboutText') || ''))
const distinctAboutText = computed(() => {
  const text = aboutText.value.trim()
  if (!text || text === description.value.trim()) return ''
  return text
})
const contentMaxWidth = computed(() => {
  const width = String(getSetting('app:appearance.home.contentWidth') || 'wide')
  return (
    {
      contained: '1280px',
      wide: '1600px',
      full: '1920px',
    }[width] || '1600px'
  )
})

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
    <MasonryItemHeader :show-gallery-controls="false" />

    <main
      class="mx-auto w-full px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:px-10"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <article class="max-w-3xl">
        <div
          class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 items-center gap-5">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="author || siteTitle"
              class="size-16 shrink-0 rounded-full object-cover sm:size-20"
            />
            <div class="min-w-0">
              <p
                class="mb-2 text-[11px] font-medium text-neutral-400 dark:text-neutral-500"
              >
                关于
              </p>
              <h1
                class="font-display text-3xl font-semibold leading-tight sm:text-4xl"
              >
                {{ author || siteTitle }}
              </h1>
              <p
                v-if="slogan"
                class="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400"
              >
                {{ slogan }}
              </p>
            </div>
          </div>

          <div
            v-if="socialLinks.length"
            class="flex shrink-0 items-center gap-0.5"
          >
            <UTooltip
              v-for="link in socialLinks"
              :key="link.id"
              :text="link.label"
            >
              <UButton
                :to="link.url"
                target="_blank"
                :icon="link.icon"
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="link.label"
              />
            </UTooltip>
          </div>
        </div>

        <div
          class="mt-14 border-t border-neutral-200 pt-10 dark:border-neutral-800"
        >
          <p
            v-if="description"
            class="font-display text-xl leading-9 text-neutral-800 sm:text-2xl sm:leading-10 dark:text-neutral-200"
          >
            {{ description }}
          </p>
          <p
            v-if="distinctAboutText"
            class="mt-8 max-w-2xl whitespace-pre-line text-[15px] leading-8 text-neutral-600 dark:text-neutral-400"
          >
            {{ distinctAboutText }}
          </p>
          <p
            v-else-if="!description"
            class="text-base leading-8 text-neutral-500 dark:text-neutral-400"
          >
            这里记录值得被留下的光线、地点与日常片段。
          </p>
        </div>
      </article>
    </main>
  </div>
</template>
