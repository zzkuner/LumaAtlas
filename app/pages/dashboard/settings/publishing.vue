<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

useHead({
  title: $t('title.publishingSettings'),
})

const { fields, state, submit, loading } = useSettingsForm('publishing')
const requestUrl = useRequestURL()

const rssFields = computed(() =>
  fields.value.filter((field) => field.key.startsWith('rss.')),
)
const visitorActionFields = computed(() =>
  fields.value.filter((field) => !field.key.startsWith('rss.')),
)
const rssUrl = computed(() => `${requestUrl.origin}/rss.xml`)
const isRssEnabled = computed(() => state['rss.enabled'] !== false)

const sameValue = (left: unknown, right: unknown) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

const isDirty = computed(() =>
  fields.value.some(
    (field) =>
      !sameValue(state[field.key], field.value ?? field.defaultValue ?? null),
  ),
)

const resetSettings = () => {
  fields.value.forEach((field) => {
    state[field.key] = field.value ?? field.defaultValue ?? null
  })
}

const handleSubmit = async () => {
  const data = Object.fromEntries(
    fields.value.map((field) => [field.key, state[field.key]]),
  )

  try {
    await submit(data)
  } catch {
    /* handled by useSettingsForm */
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('title.publishingSettings')" />
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-6">
        <section
          class="space-y-2 border-b border-neutral-200 pb-4 dark:border-neutral-800"
        >
          <h2
            class="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ $t('title.publishingSettings') }}
          </h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ $t('settings.publishing.pageDescription') }}
          </p>
        </section>

        <UForm
          id="publishingSettingsForm"
          class="space-y-6"
          @submit="handleSubmit"
        >
          <section
            class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <header
              class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
            >
              <h3
                class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
              >
                {{ $t('settings.publishing.rss.sectionTitle') }}
              </h3>
              <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {{ $t('settings.publishing.rss.sectionDescription') }}
              </p>
            </header>

            <div
              v-if="loading && rssFields.length === 0"
              class="space-y-4 px-5 py-5"
            >
              <USkeleton class="h-12 w-full" />
              <USkeleton class="h-12 w-full" />
              <USkeleton class="h-12 w-full" />
            </div>

            <div
              v-else
              class="space-y-5 px-5 py-5"
            >
              <SettingField
                v-for="field in rssFields"
                :key="field.key"
                :field="field"
                :model-value="state[field.key]"
                @update:model-value="(value) => (state[field.key] = value)"
              />

              <UFormField :label="$t('settings.publishing.rss.address')">
                <div class="flex gap-2">
                  <UInput
                    :model-value="rssUrl"
                    readonly
                    class="min-w-0 flex-1"
                  />
                  <UTooltip :text="$t('settings.publishing.rss.open')">
                    <UButton
                      icon="lucide:external-link"
                      color="neutral"
                      variant="outline"
                      :disabled="!isRssEnabled"
                      to="/rss.xml"
                      target="_blank"
                      :aria-label="$t('settings.publishing.rss.open')"
                    />
                  </UTooltip>
                </div>
              </UFormField>
            </div>
          </section>

          <section
            class="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <header
              class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
            >
              <h3
                class="text-base font-semibold text-neutral-900 dark:text-neutral-100"
              >
                {{ $t('settings.publishing.visitorActions.sectionTitle') }}
              </h3>
              <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {{
                  $t('settings.publishing.visitorActions.sectionDescription')
                }}
              </p>
            </header>

            <div class="space-y-5 px-5 py-5">
              <SettingField
                v-for="field in visitorActionFields"
                :key="field.key"
                :field="field"
                :model-value="state[field.key]"
                @update:model-value="(value) => (state[field.key] = value)"
              />
            </div>
          </section>
        </UForm>

        <footer
          class="sticky bottom-3 rounded-md border border-neutral-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
        >
          <div
            v-if="isDirty"
            class="mb-3 text-sm text-warning-700 dark:text-warning-300"
          >
            {{ $t('common.unsavedChanges') }}
          </div>
          <div class="flex items-center justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="!isDirty"
              @click="resetSettings"
            >
              {{ $t('settings.publishing.actions.reset') }}
            </UButton>
            <UButton
              type="submit"
              form="publishingSettingsForm"
              icon="lucide:save"
              :loading="loading"
              :disabled="!isDirty"
            >
              {{ $t('settings.publishing.actions.save') }}
            </UButton>
          </div>
        </footer>
      </div>
    </template>
  </UDashboardPanel>
</template>
