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
      class="mx-auto w-full px-3 pb-24 pt-8 sm:px-5 sm:pt-12 lg:px-7"
      :style="{ maxWidth: contentMaxWidth }"
    >
      <header class="border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <p class="font-display text-sm text-neutral-500 dark:text-neutral-400">
          关于本站
        </p>
        <div
          class="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="flex min-w-0 items-center gap-4">
            <img
              :src="siteLogo"
              :alt="siteTitle"
              class="size-14 shrink-0 object-contain sm:size-16"
            />
            <div class="min-w-0">
              <h1
                class="font-display truncate text-3xl font-semibold sm:text-4xl"
              >
                {{ siteTitle }}
              </h1>
              <p
                v-if="slogan"
                class="font-display mt-1 text-base text-neutral-500 dark:text-neutral-400"
              >
                {{ slogan }}
              </p>
            </div>
          </div>

          <div
            v-if="socialLinks.length"
            class="flex shrink-0 items-center gap-1"
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
                :aria-label="link.label"
              />
            </UTooltip>
          </div>
        </div>
      </header>

      <div
        class="grid gap-10 pt-10 md:grid-cols-[14rem_minmax(0,48rem)] lg:gap-16"
      >
        <aside>
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="author || siteTitle"
            class="size-20 rounded-full object-cover"
          />
          <span
            v-else
            class="flex size-20 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
          >
            <Icon
              name="lucide:user-round"
              class="size-7"
            />
          </span>
          <p class="font-display mt-4 text-lg font-semibold">
            {{ author || siteTitle }}
          </p>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            摄影与影像记录
          </p>
        </aside>

        <article class="min-w-0">
          <p
            v-if="description"
            class="font-display text-xl leading-9 text-neutral-800 sm:text-2xl dark:text-neutral-200"
          >
            {{ description }}
          </p>
          <p
            v-if="aboutText"
            class="mt-7 whitespace-pre-line text-base leading-8 text-neutral-600 dark:text-neutral-400"
          >
            {{ aboutText }}
          </p>
          <p
            v-else-if="!description"
            class="text-base leading-8 text-neutral-500 dark:text-neutral-400"
          >
            这里记录值得被留下的光线、地点与日常片段。
          </p>
        </article>
      </div>
    </main>
  </div>
</template>
