<script setup lang="ts">
definePageMeta({ layout: false })

if (getSetting('app:appearance.home.showAboutNav') !== true) {
  await navigateTo('/', { replace: true })
}

useHead({ title: () => $t('title.about') })

const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const author = computed(() => String(getSetting('app:author') || ''))
const avatarUrl = computed(() => String(getSetting('app:avatarUrl') || ''))
const aboutLead = computed(() =>
  String(getSetting('app:aboutLead') || '').trim(),
)
const aboutText = computed(() => String(getSetting('app:aboutText') || ''))
const themeStyle = usePublicThemeStyle()
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
  const defaultMeta = { label: 'Website', icon: 'lucide:globe-2' }
  const meta: Record<string, { label: string; icon: string }> = {
    website: defaultMeta,
    instagram: { label: 'Instagram', icon: 'simple-icons:instagram' },
    x: { label: 'X', icon: 'simple-icons:x' },
    github: { label: 'GitHub', icon: 'simple-icons:github' },
  }
  return Object.entries(links)
    .filter((entry): entry is [string, string] =>
      Boolean(typeof entry[1] === 'string' && /^https?:\/\//i.test(entry[1])),
    )
    .map(([id, url]) => ({ id, url, ...(meta[id] || defaultMeta) }))
})
</script>

<template>
  <div
    class="flex min-h-svh flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
    :style="themeStyle"
  >
    <MasonryItemHeader :show-gallery-controls="false" />

    <main
      class="mx-auto w-full flex-1 px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <article
        class="grid w-full gap-10 border-t border-neutral-200 pt-7 md:grid-cols-[11rem_minmax(0,44rem)] md:gap-14 md:pt-10 dark:border-neutral-800"
      >
        <div class="flex items-start justify-between md:block">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">关于</p>
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="author || siteTitle"
            class="size-11 rounded-full object-cover grayscale md:mt-10 md:size-14"
          />
        </div>

        <div class="min-w-0">
          <p class="text-xs text-neutral-400 dark:text-neutral-500">
            {{ siteTitle }}
          </p>
          <h1
            class="mt-4 font-brand text-4xl font-normal leading-tight sm:text-5xl"
            :style="{ fontFamily: 'var(--la-heading-font)' }"
          >
            {{ author || siteTitle }}
          </h1>
          <p
            v-if="aboutLead"
            class="mt-8 max-w-xl font-display text-xl leading-9 text-neutral-800 sm:text-2xl sm:leading-10 dark:text-neutral-200"
          >
            {{ aboutLead }}
          </p>

          <div
            v-if="aboutText.trim()"
            class="mt-10 max-w-2xl border-t border-neutral-200 pt-8 sm:mt-14 dark:border-neutral-800"
          >
            <p
              class="whitespace-pre-line text-[15px] leading-8 text-neutral-600 dark:text-neutral-400"
            >
              {{ aboutText.trim() }}
            </p>
          </div>

          <nav
            v-if="socialLinks.length"
            class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:mt-14"
            aria-label="作者链接"
          >
            <a
              v-for="link in socialLinks"
              :key="link.id"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              <Icon
                :name="link.icon"
                class="size-4"
              />
              {{ link.label }}
            </a>
          </nav>
        </div>
      </article>
    </main>

    <MasonryItemFooter :max-width="contentMaxWidth" />
  </div>
</template>
