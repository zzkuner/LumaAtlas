<script setup lang="ts">
import QRCode from 'qrcode'
import type { AlbumShareRecord } from '~~/shared/types/album-share'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const toast = useToast()
const albumId = computed(() => Number(route.params.albumId))
const saving = ref(false)
const deleting = ref(false)
const qrCode = ref('')
const password = ref('')
const clearPassword = ref(false)
const form = reactive({
  expiresAt: '',
  allowOriginalDownload: false,
  showExif: true,
  showMap: true,
  isActive: true,
})

const { data: album } = await useFetch<{
  id: number
  title: string
  description: string | null
}>(() => `/api/albums/${albumId.value}`)
const {
  data: share,
  refresh,
  pending,
} = await useFetch<AlbumShareRecord | null>(
  () => `/api/albums/${albumId.value}/share`,
  { default: () => null },
)

useHead(() => ({
  title: album.value
    ? `${$t('dashboard.albums.share.title')} - ${album.value.title}`
    : $t('dashboard.albums.share.title'),
}))

const applyShare = (value: AlbumShareRecord | null) => {
  form.expiresAt = value?.expiresAt
    ? new Date(value.expiresAt).toISOString().slice(0, 16)
    : ''
  form.allowOriginalDownload = value?.allowOriginalDownload ?? false
  form.showExif = value?.showExif ?? true
  form.showMap = value?.showMap ?? true
  form.isActive = value?.isActive ?? true
  password.value = ''
  clearPassword.value = false
}

watch(
  share,
  async (value) => {
    applyShare(value)
    qrCode.value = value?.url
      ? await QRCode.toDataURL(value.url, {
          width: 560,
          margin: 2,
          color: { dark: '#171717', light: '#ffffff' },
        })
      : ''
  },
  { immediate: true },
)

const save = async (regenerateToken = false) => {
  if (
    regenerateToken &&
    !confirm($t('dashboard.albums.share.regenerateConfirm'))
  )
    return

  saving.value = true
  try {
    share.value = await $fetch<AlbumShareRecord>(
      `/api/albums/${albumId.value}/share`,
      {
        method: 'POST',
        body: {
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).toISOString()
            : null,
          allowOriginalDownload: form.allowOriginalDownload,
          showExif: form.showExif,
          showMap: form.showMap,
          isActive: form.isActive,
          password: password.value || undefined,
          clearPassword: clearPassword.value,
          regenerateToken,
        },
      },
    )
    toast.add({
      title: $t('dashboard.albums.share.saved'),
      color: 'success',
      icon: 'lucide:check',
    })
  } catch (error) {
    toast.add({
      title: $t('dashboard.albums.share.saveFailed'),
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

const revoke = async () => {
  if (!confirm($t('dashboard.albums.share.revokeConfirm'))) return
  deleting.value = true
  try {
    await $fetch(`/api/albums/${albumId.value}/share`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: $t('dashboard.albums.share.revoked'), color: 'success' })
  } finally {
    deleting.value = false
  }
}

const copyLink = async () => {
  if (!share.value?.url) return
  await navigator.clipboard.writeText(share.value.url)
  toast.add({
    title: $t('dashboard.albums.share.copied'),
    color: 'success',
  })
}

const downloadQr = () => {
  if (!qrCode.value) return
  const anchor = document.createElement('a')
  anchor.href = qrCode.value
  anchor.download = `${album.value?.title || 'album'}-qr.png`
  anchor.click()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('dashboard.albums.share.title')">
        <template #leading>
          <UButton
            to="/dashboard/albums"
            icon="lucide:arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="$t('album.backToAlbums')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-7">
        <section
          class="border-b border-neutral-200 pb-5 dark:border-neutral-800"
        >
          <p class="text-xs font-medium uppercase text-neutral-500">
            {{ album?.title }}
          </p>
          <h2
            class="mt-2 text-xl font-semibold text-neutral-950 dark:text-white"
          >
            {{ $t('dashboard.albums.share.heading') }}
          </h2>
          <p
            class="mt-2 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400"
          >
            {{ $t('dashboard.albums.share.description') }}
          </p>
        </section>

        <div
          v-if="pending"
          class="flex min-h-48 items-center justify-center"
        >
          <Icon
            name="lucide:loader-circle"
            class="size-6 animate-spin"
          />
        </div>

        <template v-else>
          <section class="border border-neutral-200 dark:border-neutral-800">
            <header
              class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
            >
              <h3 class="font-semibold">
                {{ $t('dashboard.albums.share.link') }}
              </h3>
            </header>

            <div
              v-if="share"
              class="grid gap-6 px-5 py-5 md:grid-cols-[1fr_184px]"
            >
              <div class="min-w-0 space-y-4">
                <div class="flex gap-2">
                  <UInput
                    :model-value="share.url"
                    readonly
                    class="min-w-0 flex-1"
                  />
                  <UButton
                    icon="lucide:copy"
                    color="neutral"
                    @click="copyLink"
                  />
                  <UButton
                    :to="share.url"
                    target="_blank"
                    icon="lucide:external-link"
                    color="neutral"
                    variant="outline"
                  />
                </div>
                <div class="grid gap-3 text-sm sm:grid-cols-3">
                  <div
                    class="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700"
                  >
                    <p class="text-xs text-neutral-500">
                      {{ $t('dashboard.albums.share.views') }}
                    </p>
                    <p class="mt-1 font-semibold">{{ share.viewCount }}</p>
                  </div>
                  <div
                    class="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700"
                  >
                    <p class="text-xs text-neutral-500">
                      {{ $t('dashboard.albums.share.password') }}
                    </p>
                    <p class="mt-1 font-semibold">
                      {{
                        share.hasPassword ? $t('common.yes') : $t('common.no')
                      }}
                    </p>
                  </div>
                  <div
                    class="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700"
                  >
                    <p class="text-xs text-neutral-500">
                      {{ $t('dashboard.albums.share.lastViewed') }}
                    </p>
                    <p class="mt-1 truncate font-semibold">
                      {{
                        share.lastViewedAt
                          ? new Date(share.lastViewedAt).toLocaleString()
                          : '-'
                      }}
                    </p>
                  </div>
                </div>
              </div>
              <button
                v-if="qrCode"
                type="button"
                class="mx-auto border border-neutral-200 bg-white p-2 dark:border-neutral-700"
                @click="downloadQr"
              >
                <img
                  :src="qrCode"
                  alt="QR code"
                  class="size-40"
                />
              </button>
            </div>

            <div
              v-else
              class="flex flex-col items-center gap-3 px-5 py-10 text-center"
            >
              <Icon
                name="lucide:link"
                class="size-7 text-neutral-400"
              />
              <p class="text-sm text-neutral-500">
                {{ $t('dashboard.albums.share.empty') }}
              </p>
              <UButton
                icon="lucide:link-2"
                color="neutral"
                @click="save(false)"
              >
                {{ $t('dashboard.albums.share.create') }}
              </UButton>
            </div>
          </section>

          <section class="border border-neutral-200 dark:border-neutral-800">
            <header
              class="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
            >
              <h3 class="font-semibold">
                {{ $t('dashboard.albums.share.rules') }}
              </h3>
            </header>
            <div class="space-y-5 px-5 py-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField :label="$t('dashboard.albums.share.newPassword')">
                  <UInput
                    v-model="password"
                    type="password"
                    minlength="4"
                    autocomplete="new-password"
                    :placeholder="
                      $t('dashboard.albums.share.passwordPlaceholder')
                    "
                    class="w-full"
                  />
                </UFormField>
                <UFormField :label="$t('dashboard.albums.share.expiresAt')">
                  <UInput
                    v-model="form.expiresAt"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UCheckbox
                v-if="share?.hasPassword"
                v-model="clearPassword"
                :label="$t('dashboard.albums.share.clearPassword')"
              />

              <div
                class="grid gap-3 border-t border-neutral-200 pt-5 sm:grid-cols-2 dark:border-neutral-800"
              >
                <UCheckbox
                  v-model="form.isActive"
                  :label="$t('dashboard.albums.share.active')"
                />
                <UCheckbox
                  v-model="form.allowOriginalDownload"
                  :label="$t('dashboard.albums.share.allowOriginal')"
                />
                <UCheckbox
                  v-model="form.showExif"
                  :label="$t('dashboard.albums.share.showExif')"
                />
                <UCheckbox
                  v-model="form.showMap"
                  :label="$t('dashboard.albums.share.showMap')"
                />
              </div>

              <div
                class="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-5 dark:border-neutral-800"
              >
                <div class="flex gap-2">
                  <UButton
                    v-if="share"
                    icon="lucide:refresh-cw"
                    color="neutral"
                    variant="outline"
                    @click="save(true)"
                  >
                    {{ $t('dashboard.albums.share.regenerate') }}
                  </UButton>
                  <UButton
                    v-if="share"
                    icon="lucide:unlink"
                    color="error"
                    variant="ghost"
                    :loading="deleting"
                    @click="revoke"
                  >
                    {{ $t('dashboard.albums.share.revoke') }}
                  </UButton>
                </div>
                <UButton
                  icon="lucide:save"
                  color="neutral"
                  :loading="saving"
                  @click="save(false)"
                >
                  {{ $t('common.save') }}
                </UButton>
              </div>
            </div>
          </section>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
