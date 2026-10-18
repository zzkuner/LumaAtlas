<script lang="ts" setup>
definePageMeta({
  layout: 'masonry',
  // 固定 key 防止路径参数变化时创建新的实例
  key: 'photo-viewer-route',
})

const route = useRoute()
const router = useRouter()

const { switchToIndex, closeViewer, openViewer } = useViewerState()
const { isViewerOpen } = storeToRefs(useViewerState())

const { photos } = usePhotos()

const slug = computed(() => (route.params.slug as string[]) || [])
const photoId = computed(() => slug.value[0] || null)
const currentPhoto = computed(() =>
  photos.value.find((photo) => photo.id === photoId.value),
)

const requestUrl = useRequestURL()
const shareImageUrl = computed(() =>
  currentPhoto.value
    ? `${requestUrl.origin}/api/photos/${encodeURIComponent(currentPhoto.value.id)}/share-card`
    : undefined,
)

useSeoMeta({
  ogTitle: () => currentPhoto.value?.title || String(getSetting('app:title')),
  ogDescription: () =>
    currentPhoto.value?.description ||
    String(getSetting('app:description') || getSetting('app:slogan') || ''),
  ogImage: () => shareImageUrl.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => shareImageUrl.value,
})

// 处理标签查询参数
const { clearAllFilters, toggleFilter } = usePhotoFilters()

// 监听路由查询参数中的标签
watch(
  () => route.query.tag,
  (tagParam) => {
    if (tagParam && typeof tagParam === 'string' && !photoId.value) {
      clearAllFilters()
      toggleFilter('tags', tagParam)

      router.replace('/')
    }
  },
  { immediate: true },
)

watch(
  [photoId, photos],
  ([currentPhotoId, currentPhotos]) => {
    if (currentPhotoId && currentPhotos.length > 0) {
      const foundIndex = currentPhotos.findIndex(
        (photo) => photo.id === currentPhotoId,
      )
      if (foundIndex !== -1) {
        useHead({
          title: currentPhotos[foundIndex]?.title || $t('title.fallback.photo'),
        })
        if (!isViewerOpen.value) {
          // 直接访问照片详情页时，不设置 returnRoute（传入 null）
          openViewer(foundIndex, null)
        } else {
          switchToIndex(foundIndex)
        }
      }
    } else if (!currentPhotoId) {
      closeViewer()
      useHead({
        title: '',
      })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div />
</template>

<style scoped></style>
