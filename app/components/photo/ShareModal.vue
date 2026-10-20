<script lang="ts" setup>
import { AnimatePresence, motion } from 'motion-v'

const props = defineProps<{
  isOpen: boolean
  photo: Photo
}>()

const emit = defineEmits<{
  close: []
}>()

const toast = useToast()
const { gtag } = useGtag()
const { user } = useUserSession()
const isAdmin = computed(() => Boolean(user.value?.isAdmin))
const originalDownloadEnabled = computed(
  () =>
    isAdmin.value ||
    getSetting('publishing:download.originalEnabled') !== false,
)

const shareUrl = computed(() =>
  import.meta.client ? `${window.location.origin}/${props.photo.id}` : '',
)
const shareTitle = computed(
  () => props.photo.title || String(getSetting('app:title') || 'LumaAtlas'),
)
const shareCardUrl = computed(() =>
  import.meta.client
    ? `${window.location.origin}/api/photos/${encodeURIComponent(props.photo.id)}/share-card`
    : '',
)
const canNativeShare = computed(
  () => import.meta.client && typeof navigator.share === 'function',
)

const previewLoading = ref(true)
const previewError = ref(false)
const resetPreview = () => {
  previewLoading.value = true
  previewError.value = false
}

watch(
  () => [props.isOpen, props.photo.id],
  ([open]) => {
    if (open) resetPreview()
  },
)

const track = (method: string) => {
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: shareTitle.value,
    share_method: method,
  })
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    track('copy_link')
    toast.add({
      title: $t('ui.action.share.success.linkCopied'),
      color: 'success',
      icon: 'lucide:check',
    })
  } catch (error) {
    toast.add({
      title: $t('ui.action.share.error.linkCopyFailed'),
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
}

const nativeShare = async () => {
  if (!canNativeShare.value) return
  try {
    await navigator.share({ title: shareTitle.value, url: shareUrl.value })
    track('native_share')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    toast.add({
      title: $t('ui.action.share.error.nativeShareFailed'),
      color: 'error',
    })
  }
}

const download = async (url: string, filename: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status}`)
    const objectUrl = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    toast.add({
      title: $t('ui.action.share.error.ogImageDownloadFailed'),
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
}

const downloadShareCard = () =>
  download(shareCardUrl.value, `${shareTitle.value}-share.png`)

const downloadOriginal = async () => {
  if (!props.photo.originalUrl) return
  const filename =
    props.photo.storageKey?.split('/').pop() || `${shareTitle.value}.jpg`
  await download(props.photo.originalUrl, filename)
  track('download_original')
}

defineShortcuts({ escape: () => emit('close') })
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="isOpen"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black/55 px-3 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <motion.section
          :initial="{ opacity: 0, scale: 0.97, y: 12 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :exit="{ opacity: 0, scale: 0.97, y: 12 }"
          class="w-full max-w-xl overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
          @click.stop
        >
          <header
            class="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"
          >
            <div class="flex min-w-0 items-center gap-2">
              <Icon
                name="lucide:share-2"
                class="size-4 shrink-0"
              />
              <h3 class="truncate text-sm font-semibold">
                {{ $t('ui.action.share.title') }}
              </h3>
            </div>
            <UButton
              icon="lucide:x"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Close"
              @click="emit('close')"
            />
          </header>

          <div class="max-h-[calc(100dvh-5rem)] space-y-4 overflow-y-auto p-4">
            <div
              class="overflow-hidden rounded-sm bg-neutral-100 dark:bg-neutral-900"
            >
              <div
                v-if="previewLoading"
                class="flex aspect-[1200/630] items-center justify-center"
              >
                <Icon
                  name="lucide:loader-circle"
                  class="size-5 animate-spin text-neutral-400"
                />
              </div>
              <div
                v-else-if="previewError"
                class="flex aspect-[1200/630] flex-col items-center justify-center gap-2 text-neutral-500"
              >
                <Icon
                  name="lucide:image-off"
                  class="size-5"
                />
                <span class="text-xs">{{
                  $t('ui.action.share.ogImage.loadError')
                }}</span>
              </div>
              <img
                v-show="!previewLoading && !previewError"
                :src="shareCardUrl"
                :alt="shareTitle"
                class="aspect-[1200/630] w-full object-cover"
                @load="previewLoading = false"
                @error="((previewLoading = false), (previewError = true))"
              />
            </div>

            <div
              class="flex min-w-0 items-center gap-2 border-y border-neutral-200 py-3 dark:border-neutral-800"
            >
              <input
                :value="shareUrl"
                readonly
                class="h-9 min-w-0 flex-1 truncate bg-transparent text-sm outline-none"
              />
              <UButton
                icon="lucide:copy"
                color="neutral"
                variant="outline"
                @click="copyLink"
              >
                {{ $t('ui.action.share.actions.copyLink') }}
              </UButton>
            </div>

            <div class="grid gap-2 sm:grid-cols-3">
              <UButton
                v-if="canNativeShare"
                icon="lucide:send"
                color="neutral"
                variant="solid"
                block
                @click="nativeShare"
              >
                {{ $t('ui.action.share.actions.nativeShare') }}
              </UButton>
              <UButton
                icon="lucide:image-down"
                color="neutral"
                variant="outline"
                block
                @click="downloadShareCard"
              >
                {{ $t('ui.action.share.actions.downloadOgImage') }}
              </UButton>
              <UButton
                v-if="originalDownloadEnabled"
                icon="lucide:download"
                color="neutral"
                variant="outline"
                block
                :disabled="!photo.originalUrl"
                @click="downloadOriginal"
              >
                {{ $t('ui.action.share.actions.downloadOriginalImage') }}
              </UButton>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>
