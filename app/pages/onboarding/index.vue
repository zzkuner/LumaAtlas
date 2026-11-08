<script setup lang="ts">
definePageMeta({
  layout: 'onboarding',
})
</script>

<template>
  <WizardStep
    :title="$t('onboarding.welcome.title')"
    :description="$t('onboarding.welcome.description')"
  >
    <div class="space-y-6">
      <div class="text-neutral-300 text-base leading-relaxed">
        <p>
          {{ $t('onboarding.welcome.intro') }}
        </p>
      </div>

      <div class="max-w-xl divide-y divide-white/10 border-y border-white/10">
        <div class="flex items-start gap-4 py-4">
          <div
            class="flex size-8 shrink-0 items-center justify-center text-neutral-400"
          >
            <UIcon
              name="tabler:user"
              class="size-5"
            />
          </div>
          <div>
            <h3 class="font-medium text-white">
              {{ $t('onboarding.welcome.cards.admin.title') }}
            </h3>
            <p class="text-sm text-neutral-400 mt-1">
              {{ $t('onboarding.welcome.cards.admin.description') }}
            </p>
          </div>
        </div>

        <div class="flex items-start gap-4 py-4">
          <div
            class="flex size-8 shrink-0 items-center justify-center text-neutral-400"
          >
            <UIcon
              name="tabler:device-laptop"
              class="size-5"
            />
          </div>
          <div>
            <h3 class="font-medium text-white">
              {{ $t('onboarding.welcome.cards.site.title') }}
            </h3>
            <p class="text-sm text-neutral-400 mt-1">
              {{ $t('onboarding.welcome.cards.site.description') }}
            </p>
          </div>
        </div>

        <div class="flex items-start gap-4 py-4">
          <div
            class="flex size-8 shrink-0 items-center justify-center text-neutral-400"
          >
            <UIcon
              name="tabler:server"
              class="size-5"
            />
          </div>
          <div>
            <h3 class="font-medium text-white">
              {{ $t('onboarding.welcome.cards.storage.title') }}
            </h3>
            <p class="text-sm text-neutral-400 mt-1">
              {{ $t('onboarding.welcome.cards.storage.description') }}
            </p>
          </div>
        </div>

        <div class="flex items-start gap-4 py-4">
          <div
            class="flex size-8 shrink-0 items-center justify-center text-neutral-400"
          >
            <UIcon
              name="tabler:map"
              class="size-5"
            />
          </div>
          <div>
            <h3 class="font-medium text-white">
              {{ $t('onboarding.welcome.cards.map.title') }}
            </h3>
            <p class="text-sm text-neutral-400 mt-1">
              {{ $t('onboarding.welcome.cards.map.description') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <template #actions>
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <p class="min-w-0 text-xs text-neutral-500">
          {{ $t('onboarding.welcome.privacyNotice') }}
        </p>
        <WizardButton
          to="/onboarding/admin"
          color="primary"
          size="lg"
          trailing-icon="tabler:arrow-right"
        >
          {{ $t('onboarding.welcome.start') }}
        </WizardButton>
      </div>
    </template>
  </WizardStep>
</template>
