<script setup lang="ts">
import { motion } from 'motion-v'

const route = useRoute()

const steps = computed(() => [
  { label: $t('onboarding.layout.steps.welcome'), route: 'onboarding' },
  { label: $t('onboarding.layout.steps.admin'), route: 'onboarding-admin' },
  { label: $t('onboarding.layout.steps.site'), route: 'onboarding-site' },
  { label: $t('onboarding.layout.steps.storage'), route: 'onboarding-storage' },
  { label: $t('onboarding.layout.steps.map'), route: 'onboarding-map' },
  {
    label: $t('onboarding.layout.steps.complete'),
    route: 'onboarding-complete',
  },
])

const currentStepIndex = computed(() => {
  return steps.value.findIndex((s) => s.route === route.name)
})
</script>

<template>
  <div
    class="flex min-h-svh items-center justify-center bg-neutral-950 text-white selection:bg-neutral-600/40"
  >
    <motion.div
      class="my-4 flex h-[calc(100svh-2rem)] max-h-225 w-full max-w-6xl overflow-hidden border border-white/10 bg-neutral-900 sm:mx-4 lg:mx-8"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :transition="{ duration: 0.25 }"
    >
      <!-- Left Panel: Sidebar -->
      <div
        class="relative hidden w-80 flex-col gap-6 border-r border-white/10 p-8 lg:flex"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <img
            src="/favicon-96x96.png"
            alt="LumaAtlas Logo"
            class="size-14 object-contain"
          />
          <span class="font-brand text-3xl font-normal text-white">
            LumaAtlas
          </span>
        </div>

        <!-- Steps -->
        <div class="flex-1">
          <div class="space-y-1 relative">
            <!-- Connecting Line -->
            <div
              class="absolute left-6.75 top-4 bottom-4 w-0.5 bg-white/5 rounded-full"
            >
              <!-- Active Line Wrapper -->
              <div
                class="absolute top-0 left-0 w-full overflow-hidden transition-[height] duration-500 ease-in-out"
                :style="{
                  height: `${Math.min(((currentStepIndex + 1) / (steps.length - 1)) * 100, 100)}%`,
                }"
              >
                <!-- Gradient Color -->
                <div
                  class="absolute inset-0"
                  :style="{
                    background: `linear-gradient(to bottom, var(--color-primary-500) ${
                      (currentStepIndex / (currentStepIndex + 1)) * 100
                    }%, transparent)`,
                  }"
                ></div>

                <!-- Flowing Light -->
                <motion.div
                  class="absolute left-0 w-full h-20 bg-linear-to-b from-transparent via-white/60 to-transparent opacity-70"
                  :animate="{ top: ['-100%', '100%'] }"
                  :transition="{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'linear',
                    repeatDelay: 0.5,
                  }"
                />
              </div>
            </div>

            <div
              v-for="(step, index) in steps"
              :key="step.route"
              class="relative flex items-center gap-4 py-3 pl-2 group"
            >
              <!-- Active Indicator Background -->
              <motion.div
                v-if="index === currentStepIndex"
                layout-id="activeStep"
                class="absolute inset-0 bg-white/5 rounded-xl -z-10"
                :transition="{ type: 'spring', stiffness: 300, damping: 30 }"
              />

              <!-- Step Circle -->
              <div
                class="relative z-10 size-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 border-2"
                :class="[
                  index < currentStepIndex
                    ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                    : index === currentStepIndex
                      ? 'bg-neutral-900 border-primary-500 text-primary-400 shadow-lg shadow-primary-500/10'
                      : 'bg-neutral-900 border-white/10 text-neutral-500 group-hover:border-white/20',
                ]"
              >
                <UIcon
                  v-if="index < currentStepIndex"
                  name="tabler:check"
                  class="w-5 h-5"
                />
                <span v-else>{{ index + 1 }}</span>
              </div>

              <!-- Label -->
              <div class="flex flex-col">
                <span
                  class="text-sm font-medium transition-colors duration-300"
                  :class="[
                    index <= currentStepIndex
                      ? 'text-white'
                      : 'text-neutral-500 group-hover:text-neutral-400',
                  ]"
                >
                  {{ step.label }}
                </span>
                <span
                  v-if="index === currentStepIndex"
                  class="text-xs text-primary-400/80 font-medium"
                >
                  {{ $t('onboarding.layout.current') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-xs text-neutral-500 font-medium">
          v{{ $config.public.VERSION }}
        </div>
      </div>

      <!-- Right Panel: Content -->
      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <!-- Top Bar (Mobile only) -->
        <div
          class="lg:hidden flex items-center justify-between p-6 border-b border-white/5 bg-neutral-900/50 backdrop-blur-md z-20"
        >
          <div class="flex items-center gap-3">
            <img
              src="/favicon-96x96.png"
              alt="LumaAtlas Logo"
              class="size-8 object-contain"
            />
            <span class="font-brand text-lg font-semibold">LumaAtlas</span>
          </div>
          <div class="text-sm text-neutral-400">
            {{
              $t('onboarding.layout.stepCounter', [
                currentStepIndex + 1,
                steps.length,
              ])
            }}
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <slot />
        </div>
      </div>
    </motion.div>
  </div>
</template>
