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
  const defaultMeta = { label: 'Website', icon: 'lucide:globe-2' }
  const meta: Record<string, { label: string; icon: string }> = {
    website: defaultMeta,
    instagram: { label: 'Instagram', icon: 'simple-icons:instagram' },
    x: { label: 'X', icon: 'simple-icons:x' },
    github: { label: 'GitHub', icon: 'simple-icons:github' },
  }
  return Object.entries(links)
    .filter((entry): entry is [string, string] =>
      Boolean(typeof entry[1] === 'string' && entry[1]),
    )
    .map(([id, url]) => ({ id, url, ...(meta[id] || defaultMeta) }))
})
</script>

<template>
  <div
    class="flex min-h-svh flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
  >
    <MasonryItemHeader :show-gallery-controls="false" />

    <main
      class="mx-auto flex w-full flex-1 items-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <article
        class="grid w-full gap-10 border-t border-neutral-200 pt-7 md:grid-cols-[11rem_minmax(0,44rem)] md:gap-14 md:pt-10 dark:border-neutral-800"
      >
        <div class="flex items-start justify-between md:block">
          <p class="text-xs font-medium text-neutral-400 dark:text-neutral-500">
            ABOUT / 关于
          </p>
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="author || siteTitle"
            class="size-11 rounded-full object-cover grayscale md:mt-10 md:size-14"
          />
        </div>

        <div class="min-w-0">
          <h1
            class="font-display text-3xl font-normal leading-tight sm:text-5xl"
          >
            {{ author || siteTitle }}
          </h1>
          <p
            v-if="slogan"
            class="mt-4 font-display text-lg leading-8 text-neutral-500 sm:text-xl dark:text-neutral-400"
          >
            {{ slogan }}
          </p>

          <div
            class="mt-10 max-w-2xl border-l border-neutral-300 pl-5 sm:mt-14 sm:pl-7 dark:border-neutral-700"
          >
            <p
              v-if="description"
              class="font-display text-lg leading-9 text-neutral-800 sm:text-xl sm:leading-10 dark:text-neutral-200"
            >
              {{ description }}
            </p>
            <p
              v-if="distinctAboutText"
              class="whitespace-pre-line text-[15px] leading-8 text-neutral-600 dark:text-neutral-400"
              :class="description ? 'mt-7' : ''"
            >
              {{ distinctAboutText }}
            </p>
            <p
              v-else-if="!description"
              class="font-display text-lg leading-9 text-neutral-600 dark:text-neutral-300"
            >
              以照片保存那些无法重来的光线与日常。
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
