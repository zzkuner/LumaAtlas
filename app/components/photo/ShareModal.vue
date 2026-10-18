<script lang="ts" setup>
import { motion, AnimatePresence } from 'motion-v'
import QRCode from 'qrcode'

interface Props {
  isOpen: boolean
  photo: Photo
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const toast = useToast()
const { gtag } = useGtag()
const { loggedIn } = useUserSession()
const originalDownloadEnabled = computed(
  () =>
    loggedIn.value ||
    getSetting('publishing:download.originalEnabled') !== false,
)

const shareUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${props.photo.id}`
  }
  return ''
})

const shareText = computed(() => {
  const title = props.photo.title || $t('ui.action.share.fallback.photoTitle')
  const description = props.photo.description || ''
  return `${$t('ui.action.share.text.prefix')} ${title}${description ? ' - ' + description : ''}`
})

const shareTextAndUrl = computed(() => {
  return `${shareText.value}\n${shareUrl.value}`
})

// OG Image URL and loading state
const ogImageLoading = ref(true)
const ogImageError = ref(false)
const loadingTimer = ref<NodeJS.Timeout | null>(null)
const wechatQrCode = ref('')

const ogImageUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/photos/${encodeURIComponent(props.photo.id)}/share-card`
  }
  return ''
})

const updateWechatQrCode = async () => {
  wechatQrCode.value =
    props.isOpen && shareUrl.value
      ? await QRCode.toDataURL(shareUrl.value, {
          width: 320,
          margin: 1,
          color: { dark: '#171717', light: '#ffffff' },
        })
      : ''
}

// Reset loading state when photo changes or modal opens
const resetLoadingState = () => {
  ogImageLoading.value = true
  ogImageError.value = false

  // Clear existing timer
  if (loadingTimer.value) {
    clearTimeout(loadingTimer.value)
  }

  // Set a timeout to handle cases where onload/onerror never fires
  loadingTimer.value = setTimeout(() => {
    if (ogImageLoading.value) {
      ogImageLoading.value = false
      ogImageError.value = true
    }
  }, 10000) // 10 second timeout
}

// Reset loading state when photo changes
watch(() => props.photo.id, resetLoadingState)

// Reset loading state when modal opens
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      resetLoadingState()
    }
    void updateWechatQrCode()
  },
)

watch(shareUrl, () => {
  void updateWechatQrCode()
})

// Handle image load events
const handleOgImageLoad = () => {
  if (loadingTimer.value) {
    clearTimeout(loadingTimer.value)
    loadingTimer.value = null
  }
  ogImageLoading.value = false
  ogImageError.value = false
}

const handleOgImageError = () => {
  if (loadingTimer.value) {
    clearTimeout(loadingTimer.value)
    loadingTimer.value = null
  }
  ogImageLoading.value = false
  ogImageError.value = true
}

// Cleanup on unmount
onUnmounted(() => {
  if (loadingTimer.value) {
    clearTimeout(loadingTimer.value)
  }
})

// Social media share functions
const shareToTwitter = () => {
  // Track Twitter share event in Google Analytics
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'twitter',
  })

  const text = encodeURIComponent(shareText.value)
  const url = encodeURIComponent(shareUrl.value)
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    '_blank',
  )
}

const shareToTelegram = () => {
  // Track Telegram share event in Google Analytics
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'telegram',
  })

  window.open(
    `https://t.me/share/url?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(shareText.value)}`,
    '_blank',
  )
}

const shareToWeibo = () => {
  // Track Weibo share event in Google Analytics
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'weibo',
  })

  const text = encodeURIComponent(shareText.value)
  const url = encodeURIComponent(shareUrl.value)
  window.open(
    `https://service.weibo.com/share/share.php?url=${url}&title=${text}`,
    '_blank',
  )
}

const shareToQZone = () => {
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'qzone',
  })

  const params = new URLSearchParams({
    url: shareUrl.value,
    title: shareText.value,
    summary: props.photo.description || '',
    pics: ogImageUrl.value,
  })
  window.open(
    `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?${params.toString()}`,
    '_blank',
  )
}

const shareToQQ = () => {
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'qq',
  })

  const params = new URLSearchParams({
    url: shareUrl.value,
    title: shareText.value,
    summary: props.photo.description || '',
    pics: ogImageUrl.value,
  })
  window.open(
    `https://connect.qq.com/widget/shareqq/index.html?${params.toString()}`,
    '_blank',
  )
}

const shareToFacebook = () => {
  // Track Facebook share event in Google Analytics
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'facebook',
  })

  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
}

const shareToWhatsApp = () => {
  // Track WhatsApp share event in Google Analytics
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'whatsapp',
  })

  const text = encodeURIComponent(`${shareText.value}\n${shareUrl.value}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

const shareToLinkedIn = () => {
  // Track LinkedIn share event in Google Analytics
  gtag('event', 'photo_share', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    share_method: 'linkedin',
  })

  const url = encodeURIComponent(shareUrl.value)
  const title = encodeURIComponent(shareText.value)
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`,
    '_blank',
  )
}

// Copy functions
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareTextAndUrl.value)
    toast.add({
      title: $t('ui.action.share.success.linkCopied'),
      color: 'success',
      icon: 'tabler:check',
      duration: 3000,
    })
  } catch (error) {
    toast.add({
      title: $t('ui.action.share.error.linkCopyFailed'),
      description: (error as Error)?.message || 'Unknown error',
      color: 'error',
      icon: 'tabler:x',
      duration: 3000,
    })
  }
}

// Native share (for mobile devices)
const nativeShare = async () => {
  if (navigator.share) {
    try {
      // Track native share event in Google Analytics
      gtag('event', 'photo_share', {
        photo_id: props.photo.id,
        photo_title: props.photo.title || 'Untitled',
        share_method: 'native_share',
      })

      await navigator.share({
        title: shareText.value,
        url: shareUrl.value,
      })
    } catch (error) {
      console.error($t('ui.action.share.error.nativeShareFailed'), error)
    }
  }
}

// Download OG Image
const downloadOgImage = async () => {
  try {
    const response = await fetch(ogImageUrl.value)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.photo.title || 'photo'}-og.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.add({
      title: $t('ui.action.share.success.ogImageDownloaded'),
      color: 'success',
      icon: 'tabler:download',
      duration: 3000,
    })
  } catch (error) {
    toast.add({
      title: $t('ui.action.share.error.ogImageDownloadFailed'),
      description: (error as Error)?.message || 'Unknown error',
      color: 'error',
      icon: 'tabler:x',
      duration: 3000,
    })
  }
}

const downloadOriginalImage = async () => {
  try {
    const response = await fetch(props.photo.originalUrl!)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const extension = props.photo.originalUrl!.split('.').pop() || 'jpg'
    link.download = `${props.photo.title || 'photo'}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    // Track download event in Google Analytics
    gtag('event', 'photo_download', {
      photo_id: props.photo.id,
      photo_title: props.photo.title || 'Untitled',
      download_type: 'original',
    })

    toast.add({
      title: $t('ui.action.share.success.originalImageDownloaded'),
      color: 'success',
      icon: 'tabler:download',
      duration: 3000,
    })
  } catch (error) {
    toast.add({
      title: $t('ui.action.share.error.originalImageDownloadFailed'),
      description: (error as Error)?.message || 'Unknown error',
      color: 'error',
      icon: 'tabler:x',
      duration: 3000,
    })
  }
}

// Check if native share is available
const canNativeShare = computed(() => {
  return typeof window !== 'undefined' && navigator.share
})

// Social media platforms data
const socialPlatforms = computed(() => [
  {
    name: $t('ui.action.share.platforms.weibo'),
    icon: 'tabler:brand-weibo',
    color: 'text-red-500',
    action: shareToWeibo,
  },
  {
    name: $t('ui.action.share.platforms.qq'),
    icon: 'tabler:brand-qq',
    color: 'text-sky-500',
    action: shareToQQ,
  },
  {
    name: $t('ui.action.share.platforms.qzone'),
    icon: 'tabler:star',
    color: 'text-amber-500',
    action: shareToQZone,
  },
  {
    name: $t('ui.action.share.platforms.twitter'),
    icon: 'tabler:brand-twitter',
    color: 'text-blue-500',
    action: shareToTwitter,
  },
  {
    name: $t('ui.action.share.platforms.telegram'),
    icon: 'tabler:brand-telegram',
    color: 'text-blue-400',
    action: shareToTelegram,
  },
  {
    name: $t('ui.action.share.platforms.facebook'),
    icon: 'tabler:brand-facebook',
    color: 'text-blue-600',
    action: shareToFacebook,
  },
  {
    name: $t('ui.action.share.platforms.whatsapp'),
    icon: 'tabler:brand-whatsapp',
    color: 'text-green-500',
    action: shareToWhatsApp,
  },
  {
    name: $t('ui.action.share.platforms.linkedin'),
    icon: 'tabler:brand-linkedin',
    color: 'text-blue-700',
    action: shareToLinkedIn,
  },
])

// Close modal when clicking outside
const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

// Keyboard shortcuts
defineShortcuts({
  escape: () => {
    emit('close')
  },
})
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="isOpen"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.2 }"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="handleBackdropClick"
      >
        <motion.div
          :initial="{ opacity: 0, scale: 0.95, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :exit="{ opacity: 0, scale: 0.95, y: 20 }"
          :transition="{
            type: 'spring',
            duration: 0.3,
            bounce: 0.1,
          }"
          class="relative mx-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
          @click.stop
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between border-b border-white/10 p-4"
          >
            <div class="flex items-center gap-2">
              <Icon
                name="tabler:share-3"
                class="size-5 text-neutral-700 dark:text-neutral-300"
              />
              <h3
                class="text-lg font-semibold text-neutral-900 dark:text-white"
              >
                {{ $t('ui.action.share.title') }}
              </h3>
            </div>
            <UButton
              size="sm"
              variant="ghost"
              color="neutral"
              icon="tabler:x"
              @click="emit('close')"
            />
          </div>

          <!-- Content -->
          <div
            v-if="photo"
            class="overflow-y-auto p-4 sm:p-5"
          >
            <!-- Native Share (Mobile) -->
            <div
              v-if="canNativeShare || originalDownloadEnabled"
              class="mb-4 flex items-center gap-2"
            >
              <UButton
                v-if="canNativeShare"
                block
                size="lg"
                color="info"
                variant="soft"
                icon="tabler:share-2"
                @click="nativeShare"
              >
                {{ $t('ui.action.share.actions.nativeShare') }}
              </UButton>
              <UButton
                v-if="originalDownloadEnabled"
                block
                size="lg"
                color="info"
                variant="soft"
                icon="tabler:download"
                @click="downloadOriginalImage"
              >
                {{ $t('ui.action.share.actions.downloadOriginalImage') }}
              </UButton>
            </div>

            <div class="space-y-4">
              <!-- Share URL Display -->
              <div
                class="rounded-lg border border-neutral-200/50 bg-neutral-50/50 p-3 dark:border-neutral-700/50 dark:bg-neutral-800/50"
              >
                <label
                  class="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
                >
                  {{ $t('ui.action.share.actions.shareUrl') }}
                </label>
                <div class="flex items-center gap-2">
                  <input
                    :value="shareUrl"
                    readonly
                    class="flex-1 truncate bg-transparent text-sm text-neutral-800 dark:text-neutral-200 resize-none"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="tabler:copy"
                    @click="copyLink"
                  />
                </div>
              </div>

              <div
                v-if="wechatQrCode"
                class="flex items-center gap-4 border-y border-neutral-200 py-3 dark:border-neutral-800"
              >
                <img
                  :src="wechatQrCode"
                  :alt="$t('ui.action.share.platforms.wechat')"
                  class="size-24 shrink-0 bg-white p-1"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2 font-medium">
                    <Icon
                      name="tabler:brand-wechat"
                      class="size-5 text-green-600"
                    />
                    {{ $t('ui.action.share.platforms.wechat') }}
                  </div>
                  <p class="mt-1 text-sm text-neutral-500">
                    {{ $t('ui.action.share.wechatHint') }}
                  </p>
                </div>
              </div>

              <!-- OG Image Preview -->
              <div
                class="rounded-lg border border-neutral-200/50 bg-neutral-50/50 p-3 dark:border-neutral-700/50 dark:bg-neutral-800/50"
              >
                <div class="flex items-center justify-between mb-2">
                  <label
                    class="block text-xs font-medium text-neutral-600 dark:text-neutral-400"
                  >
                    {{ $t('ui.action.share.ogImage.title') }}
                  </label>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="tabler:download"
                    @click="downloadOgImage"
                  >
                    {{ $t('ui.action.share.actions.downloadOgImage') }}
                  </UButton>
                </div>
                <div
                  class="relative rounded-md bg-neutral-100/50 dark:bg-neutral-700/50 overflow-hidden"
                >
                  <!-- Loading indicator -->
                  <div
                    v-if="ogImageLoading"
                    class="flex items-center justify-center bg-neutral-100/50 dark:bg-neutral-700/50 aspect-2/1"
                  >
                    <div class="flex flex-col items-center gap-2">
                      <Icon
                        name="tabler:loader-2"
                        class="size-6 text-neutral-500 animate-spin"
                      />
                      <span
                        class="text-xs text-neutral-500 dark:text-neutral-400"
                      >
                        {{ $t('ui.action.share.ogImage.loading') }}
                      </span>
                    </div>
                  </div>

                  <!-- Error state -->
                  <div
                    v-else-if="ogImageError"
                    class="flex items-center justify-center bg-neutral-100/50 dark:bg-neutral-700/50 aspect-2/1"
                  >
                    <div class="flex flex-col items-center gap-2">
                      <Icon
                        name="tabler:photo-off"
                        class="size-6 text-neutral-400"
                      />
                      <span
                        class="text-xs text-neutral-500 dark:text-neutral-400"
                      >
                        {{ $t('ui.action.share.ogImage.loadError') }}
                      </span>
                    </div>
                  </div>

                  <!-- OG Image -->
                  <img
                    v-show="!ogImageLoading && !ogImageError"
                    :key="`og-image-${props.photo.id}`"
                    :src="ogImageUrl"
                    :alt="$t('ui.action.share.ogImage.alt')"
                    class="w-full h-auto aspect-2/1 object-cover rounded"
                    loading="eager"
                    @load="handleOgImageLoad"
                    @error="handleOgImageError"
                  />
                </div>
              </div>

              <!-- Social Platforms Grid -->
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                <button
                  v-for="platform in socialPlatforms"
                  :key="platform.name"
                  type="button"
                  class="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  @click="platform.action"
                >
                  <Icon
                    :name="platform.icon"
                    class="size-6"
                    :class="platform.color"
                  />
                  <span
                    class="text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    {{ platform.name }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped></style>
