<script lang="ts" setup>
withDefaults(
  defineProps<{
    stats?: {
      total: number
      dateRange: { start?: string; end?: string } | null
    }
    dateRangeText?: string
    maxWidth?: string
  }>(),
  {
    dateRangeText: '',
    maxWidth: '1600px',
  },
)

const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const siteAuthor = computed(() => String(getSetting('app:author') || ''))
const siteSlogan = computed(() => String(getSetting('app:slogan') || ''))
const siteDescription = computed(() =>
  String(getSetting('app:description') || ''),
)
const avatarUrl = computed(() => String(getSetting('app:avatarUrl') || ''))
const showAuthorIntro = computed(
  () => getSetting('app:appearance.home.showAuthorIntro') !== false,
)
const showSlogan = computed(
  () => getSetting('app:appearance.home.showSlogan') !== false,
)
const showStats = computed(
  () => getSetting('app:appearance.home.showStats') !== false,
)
const introTitle = computed(() => siteAuthor.value || siteTitle.value)
const introCopy = computed(() =>
  showSlogan.value ? siteSlogan.value || siteDescription.value : '',
)
</script>

<template>
  <section
    v-if="showAuthorIntro || showStats"
    class="w-full border-b border-neutral-200/80 font-display dark:border-neutral-800/80"
  >
    <div
      class="mx-auto px-3 py-5 sm:px-5 sm:py-6 lg:px-7"
      :style="{ maxWidth }"
    >
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div
          v-if="showAuthorIntro"
          class="flex min-w-0 items-center gap-4"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="introTitle"
            class="size-12 shrink-0 rounded-full object-cover sm:size-14"
          />
          <span
            v-else
            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 sm:size-14 dark:bg-neutral-900 dark:text-neutral-400"
          >
            <Icon
              name="lucide:user-round"
              class="size-5"
            />
          </span>
          <div class="min-w-0">
            <p
              class="truncate text-lg font-semibold text-neutral-950 sm:text-xl dark:text-white"
            >
              {{ introTitle }}
            </p>
            <p
              v-if="introCopy"
              class="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400"
            >
              {{ introCopy }}
            </p>
          </div>
        </div>

        <p
          v-if="showStats"
          class="shrink-0 border-t border-neutral-200 pt-3 font-sans text-sm text-neutral-500 sm:border-t-0 sm:pt-0 dark:border-neutral-800 dark:text-neutral-400"
        >
          <template v-if="stats?.total">
            {{
              $t('ui.stats.totalPhotosWithRange', {
                range: dateRangeText,
                count: stats.total,
              })
            }}
          </template>
          <template v-else>{{ $t('ui.stats.noPhotosTip') }}</template>
        </p>
      </div>
    </div>
  </section>
</template>
