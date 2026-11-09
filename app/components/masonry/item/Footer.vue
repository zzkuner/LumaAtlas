<script setup lang="ts">
defineProps<{
  maxWidth?: string
}>()

const footerText = computed(() =>
  String(
    getSetting('app:appearance.footer.text') ||
      getSetting('app:appearance.home.footerText') ||
      '',
  ).trim(),
)
const siteTitle = computed(() => String(getSetting('app:title') || 'LumaAtlas'))
const footerEnabled = computed(
  () => getSetting('app:appearance.footer.enabled') !== false,
)
const icpNumber = computed(() =>
  String(getSetting('app:appearance.footer.icpNumber') || '').trim(),
)
const showIcp = computed(
  () =>
    getSetting('app:appearance.footer.showIcp') === true &&
    Boolean(icpNumber.value),
)
const copyrightText = computed(
  () => footerText.value || `© ${new Date().getFullYear()} ${siteTitle.value}`,
)
</script>

<template>
  <footer
    v-if="footerEnabled"
    class="w-full border-t border-neutral-200 dark:border-neutral-800"
  >
    <div
      class="mx-auto flex min-h-16 flex-col items-center justify-center gap-x-4 gap-y-1 px-3 py-5 text-center text-xs leading-6 text-neutral-500 sm:flex-row sm:flex-wrap sm:px-5 lg:px-7 dark:text-neutral-400"
      :style="{ maxWidth: maxWidth || '1600px' }"
    >
      <p>
        {{ copyrightText }}
      </p>
      <a
        v-if="showIcp"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        class="transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        {{ icpNumber }}
      </a>
    </div>
  </footer>
</template>
