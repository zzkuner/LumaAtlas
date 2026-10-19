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
    class="w-full font-display"
  >
    <div
      class="mx-auto px-3 py-4 sm:px-5 lg:px-7"
      :style="{ maxWidth }"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div
          v-if="showAuthorIntro"
          class="flex min-w-0 items-center gap-3"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="introTitle"
            class="size-9 shrink-0 rounded-full object-cover"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ introTitle }}</p>
            <p
              v-if="introCopy"
              class="mt-0.5 line-clamp-1 text-xs text-neutral-500"
            >
              {{ introCopy }}
            </p>
          </div>
        </div>

        <p
          v-if="showStats"
          class="shrink-0 font-sans text-xs text-neutral-500"
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
