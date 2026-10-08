<script setup lang="ts">
defineProps<{
  maxWidth?: string
}>()

const footerText = computed(() =>
  String(getSetting('app:appearance.home.footerText') || ''),
)

const socialItems = computed(() => {
  const value = getSetting('app:appearance.home.socialLinks')
  const links =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const definitions = {
    website: { label: 'Website', icon: 'lucide:link' },
    instagram: { label: 'Instagram', icon: 'simple-icons:instagram' },
    x: { label: 'X', icon: 'simple-icons:x' },
    github: { label: 'GitHub', icon: 'simple-icons:github' },
  }

  return Object.entries(definitions).flatMap(([key, meta]) => {
    const url = String(links[key] || '').trim()
    return /^https?:\/\//i.test(url) ? [{ key, url, ...meta }] : []
  })
})

const hasContent = computed(() =>
  Boolean(footerText.value || socialItems.value.length),
)
</script>

<template>
  <footer
    v-if="hasContent"
    class="w-full border-t border-neutral-200 dark:border-neutral-800"
  >
    <div
      class="mx-auto flex min-h-20 flex-col justify-between gap-4 px-3 py-6 sm:flex-row sm:items-center sm:px-5 lg:px-7"
      :style="{ maxWidth: maxWidth || '1600px' }"
    >
      <p
        v-if="footerText"
        class="text-sm leading-6 text-neutral-500 dark:text-neutral-400"
      >
        {{ footerText }}
      </p>
      <nav
        v-if="socialItems.length"
        class="flex items-center gap-1"
        aria-label="Social links"
      >
        <UTooltip
          v-for="item in socialItems"
          :key="item.key"
          :text="item.label"
        >
          <UButton
            :to="item.url"
            target="_blank"
            rel="noopener noreferrer"
            :icon="item.icon"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="item.label"
          />
        </UTooltip>
      </nav>
    </div>
  </footer>
</template>
