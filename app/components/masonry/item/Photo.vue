<script setup lang="ts">
import { formatCameraInfo } from '~/utils/camera'
import { motion, useDomRef } from 'motion-v'
import {
  sanitizePhotoDescription,
  sanitizePhotoTitle,
} from '~~/shared/utils/photo-content'

interface Props {
  photo: Photo
  index: number
  presentation?: 'masonry' | 'grid' | 'big' | 'feed'
  imageRatio?: 'natural' | 'square' | 'landscape'
}

const props = withDefaults(defineProps<Props>(), {
  presentation: 'masonry',
  imageRatio: 'natural',
})
const emit = defineEmits<{
  'visibility-change': [
    { index: number; isVisible: boolean; date: string | Date },
  ]
  openViewer: [number]
}>()

const { gtag } = useGtag()

const photoRef = ref<HTMLElement>()
const videoRef = useDomRef()
const isVisible = ref(false)
const containerWidth = ref(0)

const isHovering = ref(false)
const isVideoPlaying = ref(false)
const isVideoLoaded = ref(false)
const videoBlob = ref<Blob | null>(null)
const videoBlobUrl = ref<string | null>(null)
const { convertMovToMp4, getProcessingState } = useLivePhotoProcessor()

const isTouching = ref(false)
const touchCount = ref(0)
const longPressTimer = ref<NodeJS.Timeout | null>(null)
const initialTouchPos = ref<{ x: number; y: number } | null>(null)
const isMobile = useMediaQuery('(max-width: 768px)')

const resizeObserverRef = ref<ResizeObserver | null>(null)
const intersectionObserverRef = ref<IntersectionObserver | null>(null)

const processingState = getProcessingState(props.photo.id)

const naturalAspectRatio = computed(() => {
  // Priority 1: Use aspectRatio from photo data if available
  if (props.photo.aspectRatio) {
    return props.photo.aspectRatio
  }

  // Priority 2: Calculate from width and height if available
  if (props.photo.width && props.photo.height) {
    return props.photo.width / props.photo.height
  }

  // Fallback: Default aspect ratio
  return 1.2
})

const isBig = computed(
  () => props.presentation === 'big' || props.presentation === 'feed',
)
const displayAspectRatio = computed(() => {
  if (isBig.value) return naturalAspectRatio.value
  if (props.imageRatio === 'square') return 1
  if (props.imageRatio === 'landscape') return 4 / 3
  return naturalAspectRatio.value
})

const isFeed = computed(() => isBig.value)
const showPhotoInfo = computed(
  () => getSetting('app:appearance.home.showPhotoInfo') !== false,
)
const showBigPhotoInfo = computed(
  () => getSetting('app:appearance.home.showBigPhotoInfo') !== false,
)
const formattedFocalLength = computed(() => {
  const value = props.photo.exif?.FocalLengthIn35mmFormat
  if (value == null || value === '') return ''
  const text = String(value).trim()
  return /mm$/i.test(text) ? text : `${text}mm`
})
const formattedLocation = computed(() => {
  if (props.photo.city) return props.photo.city
  if (props.photo.locationName) return props.photo.locationName
  if (
    typeof props.photo.latitude === 'number' &&
    typeof props.photo.longitude === 'number'
  ) {
    return `${props.photo.latitude.toFixed(5)}, ${props.photo.longitude.toFixed(5)}`
  }
  return ''
})
const contentTitle = computed(() => {
  const title = sanitizePhotoTitle(props.photo.title)
  return title === String(props.photo.id) ? '' : title
})
const contentDescription = computed(() =>
  sanitizePhotoDescription(props.photo.description),
)
const hasExposureParameters = computed(
  () =>
    !!formattedFocalLength.value ||
    !!props.photo.exif?.FNumber ||
    !!props.photo.exif?.ExposureTime ||
    !!props.photo.exif?.ISO,
)
const exposureParameterCount = computed(
  () =>
    [
      formattedFocalLength.value,
      props.photo.exif?.FNumber,
      props.photo.exif?.ExposureTime,
      props.photo.exif?.ISO,
    ].filter(Boolean).length,
)
const thumbnailSizes = computed(() =>
  isFeed.value
    ? '(max-width: 1024px) 100vw, 960px'
    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
)

const bigFrameStyle = computed(() =>
  isBig.value
    ? {
        width: `min(100%, calc(78svh * ${naturalAspectRatio.value}), calc(900px * ${naturalAspectRatio.value}))`,
        marginInline: 'auto',
      }
    : undefined,
)

// Methods
const handleImageError = () => {
  console.warn(`Failed to load image: ${props.photo.thumbnailUrl}`)
}

// LivePhoto video handling - 优化的交互逻辑
const handleMouseEnter = async () => {
  // Skip mouse events on mobile devices
  if (isMobile.value) return

  isHovering.value = true

  if (!props.photo.isLivePhoto || !props.photo.livePhotoVideoUrl) return

  // 如果视频已准备好，立即播放
  if (videoBlob.value && videoBlobUrl.value && isVideoLoaded.value) {
    playLivePhotoVideo()
  } else if (!processingState.value?.isProcessing) {
    // 如果视频还未处理，立即开始处理
    processLivePhotoWhenVisible()
  }
}

const handleMouseLeave = () => {
  // Skip mouse events on mobile devices
  if (isMobile.value) return

  isHovering.value = false
  if (videoRef.value && !videoRef.value.paused) {
    videoRef.value.pause()
    videoRef.value.currentTime = 0
  }

  // Use a slight delay for smoother transition when mouse leaves
  setTimeout(() => {
    if (!isHovering.value && !isTouching.value) {
      // Also check touching state
      isVideoPlaying.value = false
    }
  }, 150)
}

const playLivePhotoVideo = () => {
  if (!videoRef.value || !videoBlobUrl.value) return

  // 预加载视频以确保流畅播放
  if (videoRef.value.readyState < 2) {
    videoRef.value.load()
  }

  // 确保视频从头开始播放
  videoRef.value.currentTime = 0

  // 添加播放前的准备动画
  isVideoPlaying.value = true

  // Provide haptic feedback on mobile when starting playback
  if (isMobile.value && 'vibrate' in navigator) {
    navigator.vibrate(50) // Short vibration for start
  }

  // 延迟播放以确保动画状态已设置
  nextTick(() => {
    if (!videoRef.value || !isVideoPlaying.value) return

    // 设置视频播放属性
    videoRef.value.muted = true // 确保静音播放
    videoRef.value.playsInline = true

    // 立即尝试播放，使用更好的错误处理
    const playPromise = videoRef.value.play()

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // 播放成功，确保状态正确
          if (videoRef.value && !videoRef.value.paused) {
            // 视频播放成功，状态已正确设置
          }
        })
        .catch((error: any) => {
          console.warn('Failed to play LivePhoto video:', error)
          isVideoPlaying.value = false

          // 如果是因为用户交互策略导致的失败，尝试重新加载
          if (error.name === 'NotAllowedError') {
            console.log('Video play blocked by browser policy, retrying...')
            if (videoRef.value) {
              videoRef.value.load()
              setTimeout(() => {
                if (videoRef.value && isVideoPlaying.value) {
                  const retryPromise = videoRef.value.play()
                  if (retryPromise !== undefined) {
                    retryPromise.catch(() => {
                      isVideoPlaying.value = false
                    })
                  }
                }
              }, 100)
            }
          }
        })
    }
  })
}

const handleVideoEnded = () => {
  // Provide haptic feedback on mobile when ending playback
  if (isMobile.value && 'vibrate' in navigator) {
    navigator.vibrate(30) // Shorter vibration for end
  }

  // Add a small delay before hiding video to make the transition smoother
  setTimeout(() => {
    isVideoPlaying.value = false
  }, 100)
}

// Mobile touch handlers for LivePhoto
const handleTouchStart = (event: TouchEvent) => {
  if (!isMobile.value || !props.photo.isLivePhoto || !videoBlobUrl.value) return

  touchCount.value = event.touches.length

  // Only handle single finger touch to avoid conflicts with pinch-to-zoom and scrolling
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    if (touch) {
      initialTouchPos.value = { x: touch.clientX, y: touch.clientY }
      isTouching.value = true

      // Set a timer for long press (350ms)
      longPressTimer.value = setTimeout(() => {
        // Double check: only play if still single touch and touching
        if (isTouching.value && touchCount.value === 1) {
          playLivePhotoVideo()
        }
      }, 350)
    }
  }
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isMobile.value || !isTouching.value || !initialTouchPos.value) return

  touchCount.value = event.touches.length

  // If user adds more fingers, cancel LivePhoto playback
  if (event.touches.length > 1) {
    cancelLivePhotoTouch()
    return
  }

  // Check if user is moving finger significantly (scrolling intent)
  const touch = event.touches[0]
  if (touch) {
    const deltaX = Math.abs(touch.clientX - initialTouchPos.value.x)
    const deltaY = Math.abs(touch.clientY - initialTouchPos.value.y)
    const threshold = 10 // pixels

    // If movement exceeds threshold, cancel LivePhoto and allow scrolling
    if (deltaX > threshold || deltaY > threshold) {
      cancelLivePhotoTouch()
    }
  }
}

const handleTouchEnd = () => {
  if (!isMobile.value) return

  cancelLivePhotoTouch()
}

const cancelLivePhotoTouch = () => {
  const wasPlaying = isVideoPlaying.value

  touchCount.value = 0
  isTouching.value = false
  initialTouchPos.value = null

  // Clear the long press timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }

  // Stop video playback
  if (videoRef.value && !videoRef.value.paused) {
    videoRef.value.pause()
    videoRef.value.currentTime = 0

    // Provide haptic feedback on mobile when manually stopping playback
    if (isMobile.value && wasPlaying && 'vibrate' in navigator) {
      navigator.vibrate(25) // Very short vibration for manual stop
    }
  }

  // Use a slight delay for smoother transition
  setTimeout(() => {
    if (!isTouching.value && !isHovering.value) {
      isVideoPlaying.value = false
    }
  }, 150)
}

// Handle click events - prevent opening viewer when video is playing
const handleClick = (event: Event) => {
  // On mobile, if video is playing or user is touching, don't open the viewer
  if (isMobile.value && (isVideoPlaying.value || isTouching.value)) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  // Track photo view event in Google Analytics
  gtag('event', 'photo_view', {
    photo_id: props.photo.id,
    photo_title: props.photo.title || 'Untitled',
    has_live_photo: props.photo.isLivePhoto ? 'yes' : 'no',
  })

  // On desktop, always allow opening the viewer
  // Otherwise, open the viewer
  emit('openViewer', props.index)
}

// 智能LivePhoto处理：基于可见性和用户行为
const processLivePhotoWhenVisible = async () => {
  if (
    !props.photo.isLivePhoto ||
    !props.photo.livePhotoVideoUrl ||
    !isVisible.value
  )
    return

  try {
    // 使用优化的转换函数，支持重试和缓存
    const blob = await convertMovToMp4(
      props.photo.livePhotoVideoUrl,
      props.photo.id,
    )

    if (blob) {
      videoBlob.value = blob
      // Clean up previous blob URL
      if (videoBlobUrl.value) {
        URL.revokeObjectURL(videoBlobUrl.value)
      }
      videoBlobUrl.value = URL.createObjectURL(blob)
      isVideoLoaded.value = true

      // 预热视频元素以提高播放性能
      if (videoRef.value) {
        videoRef.value.load()
      }
    }
  } catch (error) {
    console.error('Failed to process LivePhoto:', error)
    // 错误状态会通过processingState反映出来
  }
}

const formatExposureTime = (
  exposureTime: string | number | undefined,
): string => {
  if (!exposureTime) return ''

  let seconds: number

  // Handle different input formats
  if (typeof exposureTime === 'string') {
    // Try to parse fraction format like "1/60"
    if (exposureTime.includes('/')) {
      const parts = exposureTime.split('/')
      if (parts.length === 2 && parts[0] && parts[1]) {
        const numerator = parseFloat(parts[0])
        const denominator = parseFloat(parts[1])
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          seconds = numerator / denominator
        } else {
          return exposureTime // Return original if can't parse
        }
      } else {
        return exposureTime // Return original if format is unexpected
      }
    } else {
      // Try to parse as decimal
      seconds = parseFloat(exposureTime)
      if (isNaN(seconds)) {
        return exposureTime // Return original if can't parse
      }
    }
  } else {
    seconds = exposureTime
  }

  // Convert to fraction format
  if (seconds >= 1) {
    // For exposures 1 second or longer, show as decimal with "s"
    return `${seconds}s`
  } else {
    // For fast exposures, convert to 1/x format
    const denominator = Math.round(1 / seconds)
    return `1/${denominator}`
  }
}

// Preload image on mount to get dimensions
onMounted(() => {
  // Get container width
  nextTick(() => {
    if (photoRef.value) {
      containerWidth.value = photoRef.value.offsetWidth

      // Set up resize observer to track width changes
      const resizeObserver = new ResizeObserver(() => {
        if (photoRef.value) {
          containerWidth.value = photoRef.value.offsetWidth
        }
      })
      resizeObserver.observe(photoRef.value)
      resizeObserverRef.value = resizeObserver
    }
  })

  // Set up intersection observer for visibility tracking
  nextTick(() => {
    if (photoRef.value) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const newVisibility = entry.isIntersecting
            if (newVisibility !== isVisible.value) {
              isVisible.value = newVisibility
              emit('visibility-change', {
                index: props.index,
                isVisible: newVisibility,
                date: props.photo.dateTaken || new Date().toISOString(),
              })

              // Process LivePhoto when it becomes visible
              if (newVisibility) {
                nextTick(() => {
                  processLivePhotoWhenVisible()
                })
              }
            }
          })
        },
        {
          threshold: 0.1, // Trigger when 10% of the item is visible
          rootMargin: '50px 0px 50px 0px', // Add some margin for smoother transitions
        },
      )

      observer.observe(photoRef.value)
      intersectionObserverRef.value = observer
    }
  })
})

// Cleanup observers on unmount
onUnmounted(() => {
  if (resizeObserverRef.value) {
    resizeObserverRef.value.disconnect()
  }
  if (intersectionObserverRef.value) {
    intersectionObserverRef.value.disconnect()
  }

  // Clean up touch timer
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }

  // Clean up video blob URL
  if (videoBlobUrl.value) {
    URL.revokeObjectURL(videoBlobUrl.value)
  }
})
</script>

<template>
  <div
    ref="photoRef"
    class="photo-item w-full cursor-pointer select-none transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    role="button"
    tabindex="0"
    :aria-label="contentTitle ? `查看照片：${contentTitle}` : '查看照片详情'"
    :class="{
      'flex flex-col py-1 sm:py-4': isBig,
    }"
    :style="{
      transform: 'translateZ(0)',
    }"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
    @contextmenu.prevent=""
  >
    <div
      class="group relative overflow-hidden transition-all duration-300"
      :style="{
        ...bigFrameStyle,
        borderRadius: 'var(--la-radius, 0px)',
      }"
    >
      <!-- Container with fixed aspect ratio -->
      <div
        class="w-full relative"
        :style="{ aspectRatio: displayAspectRatio }"
      >
        <ThumbImage
          :src="photo.thumbnailUrl || ''"
          :sources="photo.thumbnailVariants"
          :sizes="thumbnailSizes"
          :alt="photo.title || 'Photo thumbnail'"
          :thumbhash="photo.thumbnailHash || ''"
          :image-contain="isBig"
          class="absolute inset-0 h-full w-full transition-transform duration-500"
          :class="
            isBig
              ? 'bg-neutral-100 dark:bg-neutral-900'
              : 'object-cover group-hover:scale-105'
          "
          @error="handleImageError"
        />

        <!-- LivePhoto video with enhanced motion transition -->
        <motion.video
          v-if="photo.isLivePhoto && videoBlobUrl"
          ref="videoRef"
          :src="videoBlobUrl"
          class="absolute inset-0 w-full h-full object-cover"
          :class="{ 'select-none pointer-events-none': isVideoPlaying }"
          muted
          playsinline
          preload="metadata"
          :initial="{
            opacity: 0,
            scale: 1.02,
          }"
          :animate="{
            opacity: isVideoPlaying ? 1 : 0,
            scale: isVideoPlaying ? 1 : 1.02,
          }"
          :transition="{
            duration: isVideoPlaying ? 0.3 : 0.2,
            ease: isVideoPlaying
              ? [0.23, 1, 0.32, 1]
              : [0.25, 0.46, 0.45, 0.94],
            delay: isVideoPlaying ? 0.05 : 0,
          }"
          @ended="handleVideoEnded"
          @loadeddata="
            () => {
              // 视频加载完成后预热
              if (videoRef && !isVideoPlaying) {
                videoRef.currentTime = 0.1
                videoRef.pause()
              }
            }
          "
        />
      </div>

      <!-- Overlay -->
      <div
        v-if="!isFeed && showPhotoInfo"
        class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"
      />

      <!-- Live Photo indicator -->
      <PhotoLivePhotoIndicator
        v-if="photo.isLivePhoto"
        class="absolute left-2 top-2 z-20"
        :photo="photo"
        :is-video-playing="isVideoPlaying"
        :processing-state="processingState || null"
      />

      <!-- Photo info overlay (bottom) -->
      <div
        v-if="
          !isFeed &&
          showPhotoInfo &&
          (contentTitle ||
            contentDescription ||
            photo.dateTaken ||
            photo.city ||
            photo.exif?.Make ||
            photo.exif?.Model ||
            hasExposureParameters)
        "
        class="photo-thumb-overlay pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 text-white"
      >
        <div class="text-white flex flex-col gap-1">
          <div class="flex flex-col">
            <p
              v-if="contentTitle"
              class="text-base font-medium text-ellipsis line-clamp-1"
            >
              {{ contentTitle }}
            </p>
            <p
              v-if="contentDescription"
              class="text-xs text-justify opacity-80 line-clamp-2"
            >
              {{ contentDescription }}
            </p>
            <p
              v-if="showPhotoInfo && (photo.dateTaken || photo.city)"
              class="text-xs font-medium opacity-80"
            >
              <span v-if="photo.dateTaken">
                {{ $dayjs(photo.dateTaken).format('YYYY-MM-DD') }}
              </span>
              <span v-if="photo.city">
                <span v-if="photo.dateTaken"> · </span>{{ photo.city }}
              </span>
            </p>
          </div>
          <div
            v-if="showPhotoInfo && photo.tags?.length"
            class="mt-1 flex items-center gap-1"
          >
            <UBadge
              v-for="tag in photo.tags"
              :key="tag"
              size="sm"
              color="neutral"
              class="bg-white/20 text-white/80 backdrop-blur-3xl"
            >
              {{ tag }}
            </UBadge>
          </div>
          <div v-if="showPhotoInfo">
            <!-- Camera info from EXIF if available -->
            <div
              v-if="photo.exif && (photo.exif.Make || photo.exif.Model)"
              class="text-sm opacity-70 mt-1 flex items-center gap-1"
            >
              <Icon
                name="lucide:camera"
                class="size-4"
              />
              <span class="text-xs font-medium text-ellipsis line-clamp-1">
                {{ formatCameraInfo(photo.exif.Make, photo.exif.Model) }}
              </span>
            </div>
            <!-- Photo specs from EXIF -->
            <div
              v-if="
                photo.exif &&
                (photo.exif.FocalLengthIn35mmFormat ||
                  photo.exif.FNumber ||
                  photo.exif.ExposureTime ||
                  photo.exif.ISO)
              "
              class="text-sm opacity-70 mt-1 flex gap-2"
            >
              <div
                v-if="photo.exif.FocalLengthIn35mmFormat"
                class="flex items-center gap-0.5"
              >
                <Icon
                  name="lucide:focus"
                  class="-mt-0.5 size-4"
                />
                <span class="text-xs font-medium">
                  {{ photo.exif.FocalLengthIn35mmFormat }}
                </span>
              </div>
              <div
                v-if="photo.exif.FNumber"
                class="flex items-center gap-0.5"
              >
                <Icon
                  name="lucide:aperture"
                  class="-mt-0.5 size-4"
                />
                <span class="text-xs font-medium">
                  f/{{ photo.exif.FNumber }}
                </span>
              </div>
              <div
                v-if="photo.exif.ExposureTime"
                class="flex items-center gap-0.5"
              >
                <Icon
                  name="lucide:gauge"
                  class="-mt-0.5 size-4"
                />
                <span class="text-xs font-medium">
                  {{ formatExposureTime(photo.exif.ExposureTime) }}
                </span>
              </div>
              <div
                v-if="photo.exif.ISO"
                class="flex items-center gap-0.5"
              >
                <span
                  class="inline-flex h-4 min-w-5 items-center justify-center border border-current px-0.5 text-[9px] font-semibold leading-none"
                >
                  ISO
                </span>
                <span class="text-xs font-medium">{{ photo.exif.ISO }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isFeed && (contentTitle || contentDescription)"
        class="photo-big-caption pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/75 via-black/20 to-transparent px-4 pb-4 pt-14 text-white sm:px-6 sm:pb-6"
      >
        <h3
          v-if="contentTitle"
          class="font-display text-xl font-medium leading-snug sm:text-2xl"
          :style="{ fontFamily: 'var(--la-heading-font)' }"
        >
          {{ contentTitle }}
        </h3>
        <p
          v-if="contentDescription"
          class="mt-1 line-clamp-2 text-sm leading-relaxed text-white/85"
        >
          {{ contentDescription }}
        </p>
      </div>
    </div>

    <div
      v-if="
        isFeed &&
        showBigPhotoInfo &&
        (hasExposureParameters ||
          photo.exif?.Make ||
          photo.exif?.Model ||
          formattedLocation ||
          photo.dateTaken)
      "
      class="relative mx-auto w-full max-w-6xl border-b border-neutral-200/70 px-10 py-3 sm:px-12 sm:py-4 dark:border-neutral-800/70"
    >
      <div class="min-w-0 font-sans sm:hidden">
        <div class="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <div
            v-if="hasExposureParameters"
            class="w-full gap-x-2 gap-y-1.5 text-xs leading-5 text-neutral-800 tabular-nums dark:text-neutral-200"
            :class="exposureParameterCount === 4
              ? 'grid grid-cols-2 justify-items-center'
              : 'flex flex-wrap justify-center'"
          >
            <span
              v-if="formattedFocalLength"
              class="inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Icon name="lucide:focus" class="size-3.5 text-neutral-500" />
              {{ formattedFocalLength }}
            </span>
            <span
              v-if="photo.exif?.FNumber"
              class="inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Icon name="lucide:aperture" class="size-3.5 text-neutral-500" />
              ƒ/{{ photo.exif.FNumber }}
            </span>
            <span
              v-if="photo.exif?.ExposureTime"
              class="inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Icon name="lucide:timer" class="size-3.5 text-neutral-500" />
              {{ formatExposureTime(photo.exif.ExposureTime) }}
            </span>
            <span
              v-if="photo.exif?.ISO"
              class="whitespace-nowrap"
            >
              ISO {{ photo.exif.ISO }}
            </span>
          </div>

          <div
            v-if="formattedLocation"
            class="flex max-w-full min-w-0 items-center justify-center gap-1.5 text-[13px] font-medium leading-5 text-neutral-700 dark:text-neutral-200"
            aria-label="拍摄位置"
          >
            <Icon name="lucide:map-pin" class="size-3.5 shrink-0" />
            <span class="min-w-0 truncate" :title="formattedLocation">{{ formattedLocation }}</span>
          </div>

          <div
            v-if="photo.exif?.Make || photo.exif?.Model || photo.dateTaken"
            class="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400"
          >
            <span
              v-if="photo.exif?.Make || photo.exif?.Model"
              class="inline-flex min-w-0 max-w-full items-center gap-1"
            >
              <Icon name="lucide:camera" class="size-3 shrink-0" />
              <span class="truncate">{{ formatCameraInfo(photo.exif.Make, photo.exif.Model) }}</span>
            </span>
            <time
              v-if="photo.dateTaken"
              :datetime="$dayjs(photo.dateTaken).toISOString()"
              class="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"
            >
              <Icon name="lucide:clock-3" class="size-3" />
              {{ $dayjs(photo.dateTaken).format('YYYY.MM.DD HH:mm') }}
            </time>
          </div>
        </div>
      </div>

      <div class="hidden min-w-0 flex-wrap items-start justify-center gap-x-8 gap-y-3 font-sans text-sm leading-6 text-neutral-800 sm:flex dark:text-neutral-200">
          <div
            v-if="hasExposureParameters"
            class="min-w-0 text-center tabular-nums"
            aria-label="拍摄参数"
          >
            <span class="mb-0.5 block text-xs text-neutral-500 dark:text-neutral-400">参数</span>
            <span class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span
                v-if="formattedFocalLength"
                class="inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Icon name="lucide:focus" class="size-4 text-neutral-500" />
                {{ formattedFocalLength }}
              </span>
              <span
                v-if="photo.exif?.FNumber"
                class="inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Icon name="lucide:aperture" class="size-4 text-neutral-500" />
                ƒ/{{ photo.exif.FNumber }}
              </span>
              <span
                v-if="photo.exif?.ExposureTime"
                class="inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Icon name="lucide:timer" class="size-4 text-neutral-500" />
                {{ formatExposureTime(photo.exif.ExposureTime) }}
              </span>
              <span
                v-if="photo.exif?.ISO"
                class="whitespace-nowrap"
              >
                ISO {{ photo.exif.ISO }}
              </span>
            </span>
          </div>

          <div
            v-if="photo.exif?.Make || photo.exif?.Model"
            class="min-w-0 max-w-56 text-center"
            aria-label="相机"
          >
            <span class="mb-0.5 block text-xs text-neutral-500 dark:text-neutral-400">相机</span>
            <span
              class="flex min-w-0 items-center justify-center gap-1.5"
              :title="formatCameraInfo(photo.exif.Make, photo.exif.Model)"
            >
              <Icon name="lucide:camera" class="size-4 shrink-0 text-neutral-500" />
              <span class="min-w-0 truncate">{{ formatCameraInfo(photo.exif.Make, photo.exif.Model) }}</span>
            </span>
          </div>

          <div
            v-if="formattedLocation"
            class="min-w-0 max-w-64 text-center"
            aria-label="拍摄位置"
          >
            <span class="mb-0.5 block text-xs text-neutral-500 dark:text-neutral-400">位置</span>
            <span class="flex min-w-0 items-center justify-center gap-1.5" :title="formattedLocation">
              <Icon name="lucide:map-pin" class="size-4 shrink-0 text-neutral-500" />
              <span class="min-w-0 truncate">{{ formattedLocation }}</span>
            </span>
          </div>

          <div
            v-if="photo.dateTaken"
            class="text-center"
            aria-label="拍摄时间"
          >
            <span class="mb-0.5 block text-xs text-neutral-500 dark:text-neutral-400">时间</span>
            <time
              :datetime="$dayjs(photo.dateTaken).toISOString()"
              class="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums"
            >
              <Icon name="lucide:clock-3" class="size-4 text-neutral-500" />
              {{ $dayjs(photo.dateTaken).format('YYYY.MM.DD · HH:mm') }}
            </time>
          </div>
      </div>

      <UTooltip text="查看详情">
        <UButton
          icon="lucide:ellipsis"
          color="neutral"
          variant="ghost"
          size="sm"
          class="absolute right-1 top-1 sm:right-2 sm:top-1/2 sm:-translate-y-1/2"
          aria-label="查看详情"
          @click.stop="emit('openViewer', index)"
        />
      </UTooltip>
    </div>
  </div>
</template>

<style scoped>
.photo-thumb-overlay {
  opacity: 0;
  transform: translateY(0.75rem);
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .photo-item:hover .photo-thumb-overlay {
    opacity: 1;
    transform: translateY(0);
  }
}

.photo-item:focus-visible .photo-thumb-overlay {
  opacity: 1;
  transform: translateY(0);
}

.photo-big-caption {
  opacity: 0;
  transform: translateY(0.5rem);
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .photo-item:hover .photo-big-caption {
    opacity: 1;
    transform: translateY(0);
  }
}

.photo-item:focus-visible .photo-big-caption {
  opacity: 1;
  transform: translateY(0);
}
</style>
