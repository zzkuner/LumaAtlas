<script setup lang="ts">
import {
  ABOUT_LINK_OPTIONS,
  isPublicAboutLink,
  normalizeAboutLinks,
} from '~~/shared/utils/about-links'

definePageMeta({ layout: false })

if (getSetting('app:appearance.home.showAboutNav') !== true) {
  await navigateTo('/', { replace: true })
}

useHead({ title: () => $t('title.about') })

const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const author = computed(() => String(getSetting('app:author') || ''))
const avatarUrl = computed(() => String(getSetting('app:avatarUrl') || ''))
const showAuthor = computed(
  () => getSetting('app:appearance.about.showAuthor') !== false,
)
const showAvatar = computed(
  () => getSetting('app:appearance.about.showAvatar') !== false,
)
const aboutLead = computed(() =>
  String(getSetting('app:aboutLead') || '').trim(),
)
const aboutText = computed(() =>
  String(getSetting('app:aboutText') || '').trim(),
)
const heading = computed(() =>
  showAuthor.value && author.value.trim()
    ? author.value.trim()
    : aboutLead.value || siteTitle.value,
)
const leadBelowHeading = computed(() =>
  Boolean(aboutLead.value && heading.value !== aboutLead.value),
)
const paragraphs = computed(() =>
  aboutText.value
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean),
)
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
  const links = normalizeAboutLinks(
    getSetting('app:appearance.home.socialLinks'),
  )
  return ABOUT_LINK_OPTIONS.flatMap((option) => {
    const link = links[option.id]
    return link.enabled && isPublicAboutLink(link.url)
      ? [{ ...option, ...link, label: link.label.trim() || option.label }]
      : []
  })
})
</script>

<template>
  <div
    class="flex min-h-svh flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white"
    :style="themeStyle"
  >
    <MasonryItemHeader :show-gallery-controls="false" />

    <main
      class="mx-auto w-full flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-10"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <article class="mx-auto w-full max-w-[48rem]">
        <header
          class="border-t border-neutral-200 pt-6 dark:border-neutral-800"
        >
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            关于 · {{ siteTitle }}
          </p>
          <div class="mt-9 flex items-start justify-between gap-8 sm:mt-11">
            <h1
              class="min-w-0 font-display text-3xl font-normal leading-snug sm:text-4xl"
              :style="{ fontFamily: 'var(--la-heading-font)' }"
            >
              {{ heading }}
            </h1>
            <img
              v-if="showAvatar && avatarUrl"
              :src="avatarUrl"
              :alt="showAuthor ? author : ''"
              class="size-16 shrink-0 rounded-full object-cover grayscale sm:size-20"
            />
          </div>
          <p
            v-if="leadBelowHeading"
            class="mt-6 max-w-[40rem] font-display text-xl leading-relaxed text-neutral-700 sm:mt-7 sm:text-2xl dark:text-neutral-300"
          >
            {{ aboutLead }}
          </p>
        </header>

        <div
          v-if="paragraphs.length"
          class="mt-6 space-y-7 border-t border-neutral-200 pt-5 font-display text-base leading-9 text-neutral-600 sm:mt-7 sm:pt-6 sm:text-lg sm:leading-10 dark:border-neutral-800 dark:text-neutral-400"
        >
          <p
            v-for="(paragraph, index) in paragraphs"
            :key="index"
            class="whitespace-pre-line"
          >
            {{ paragraph }}
          </p>
        </div>

        <nav
          v-if="socialLinks.length"
          class="mt-9 border-t border-neutral-200 pt-6 sm:mt-11 dark:border-neutral-800"
          aria-label="作者链接"
        >
          <p class="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
            链接
          </p>
          <div class="flex flex-wrap items-center gap-x-7 gap-y-4">
            <a
              v-for="link in socialLinks"
              :key="link.id"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 font-display text-base text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              <Icon
                :name="link.icon"
                class="size-4 shrink-0"
              />
              {{ link.label }}
            </a>
          </div>
        </nav>
      </article>
    </main>

    <MasonryItemFooter :max-width="contentMaxWidth" />
  </div>
</template>
