<script setup lang="ts">
import dayjsLocale_zhCN from 'dayjs/locale/zh-cn'
import dayjsLocale_zhTW from 'dayjs/locale/zh-tw'
import dayjsLocale_zhHK from 'dayjs/locale/zh-hk'
import { sanitizePhotoContent } from '~~/shared/utils/photo-content'

const router = useRouter()
const route = useRoute()
const dayjs = useDayjs()
const colorMode = useColorMode()
const localeRef = ref('en')
try {
  const { locale } = useI18n()
  watch(
    locale,
    (value) => {
      localeRef.value = value
    },
    { immediate: true },
  )
} catch {
  // i18n context may be unavailable during early server-side error rendering
}

// 初始化设置系统 - 一次性加载所有设置
const settingsStore = useSettingsStore()
const appTitle = useSettingRef('app:title')
const siteLogo = useSettingRef('app:logoUrl')
const rssEnabled = useSettingRef('publishing:rss.enabled')
const appearanceTheme = useSettingRef('app:appearance.theme')
const publicThemeStyle = usePublicThemeStyle()

const viewerState = useViewerState()
const { switchToIndex, closeViewer, clearReturnRoute } = viewerState
const {
  currentPhotoIndex,
  isViewerOpen,
  returnRoute,
  isDirectAccess,
  sourcePhotoIds,
  sourcePhotos,
} = storeToRefs(viewerState)

useHead({
  titleTemplate: (title) =>
    `${title ? title + ' | ' : ''}${appTitle.value || 'LumaAtlas'}`,
})

useHead(() => ({
  link: [
    {
      rel: 'icon',
      href: String(siteLogo.value || '').trim() || '/lumaatlas-icon.svg',
    },
    {
      rel: 'apple-touch-icon',
      href: String(siteLogo.value || '').trim() || '/apple-touch-icon.png',
    },
    ...(rssEnabled.value === false
      ? []
      : [
          {
            rel: 'alternate' as const,
            type: 'application/rss+xml',
            title: `${appTitle.value || 'LumaAtlas'} RSS`,
            href: '/rss.xml',
          },
        ]),
  ],
}))

// Only administrators can load hidden photos. This keeps the data source in
// sync with the controls exposed by the public and dashboard interfaces.
const { user } = useUserSession()
const apiEndpoint = computed(() =>
  user.value?.isAdmin ? '/api/photos' : '/api/photos/visible',
)
const shouldLoadPhotoLibrary = computed(
  () =>
    route.matched.some((record) => record.path.includes(':slug')) ||
    route.path === '/albums' ||
    route.path === '/dashboard' ||
    route.path === '/dashboard/photos' ||
    route.path === '/dashboard/albums' ||
    route.path === '/dashboard/settings/general',
)
const requestFetch = useRequestFetch()
const publicPage = useState('public-photo-page', () => 1)
const publicTotalPages = useState('public-photo-total-pages', () => 1)
const directPhotoOnly = useState('public-photo-direct-only', () => false)
const loadingMore = ref(false)
const toast = useToast()

// Resolve every Pinia-backed composable before the first await. Vue's
// injection context is not guaranteed to survive an async SSR boundary.
await settingsStore.initSettings()
colorMode.preference = appearanceTheme.value as string

const { data, refresh, status } = await useAsyncData(
  'global-photo-library',
  async () => {
    if (!shouldLoadPhotoLibrary.value) {
      directPhotoOnly.value = false
      return [] as Photo[]
    }
    if (user.value?.isAdmin) return requestFetch<Photo[]>(apiEndpoint.value)
    const slug = route.params.slug
    const directPhotoId = Array.isArray(slug) ? slug[0] : null
    if (directPhotoId) {
      directPhotoOnly.value = true
      const photo = await requestFetch<Photo>(
        `/api/photos/${encodeURIComponent(directPhotoId)}`,
      )
      return [photo]
    }
    const response = await requestFetch<{
      items: Photo[]
      totalPages: number
    }>('/api/photos/visible', { query: { page: 1, limit: 100 } })
    publicPage.value = 1
    publicTotalPages.value = response.totalPages
    directPhotoOnly.value = false
    return response.items
  },
  {
    watch: [apiEndpoint, shouldLoadPhotoLibrary],
    default: () => [] as Photo[],
  },
)

const photos = computed(() => {
  const library = (data.value as Photo[]) || []
  return route.path.startsWith('/dashboard')
    ? library
    : library.map(sanitizePhotoContent)
})

const viewerPhotos = computed(() => {
  return resolvePhotoCollection(
    sourcePhotos.value || photos.value,
    sourcePhotoIds.value,
  )
})

const loadMorePhotos = async () => {
  if (
    !import.meta.client ||
    route.path !== '/' ||
    user.value?.isAdmin ||
    loadingMore.value ||
    publicPage.value >= publicTotalPages.value
  )
    return
  loadingMore.value = true
  try {
    const nextPage = publicPage.value + 1
    const response = await $fetch<{ items: Photo[]; totalPages: number }>(
      '/api/photos/visible',
      { query: { page: nextPage, limit: 100 } },
    )
    data.value = [...(data.value || []), ...response.items]
    publicPage.value = nextPage
    publicTotalPages.value = response.totalPages
  } catch {
    toast.add({ title: '加载更多照片失败，请稍后重试', color: 'error' })
  } finally {
    loadingMore.value = false
  }
}

const onGalleryScroll = () => {
  if (
    document.documentElement.scrollHeight -
      window.scrollY -
      window.innerHeight <
    1500
  ) {
    void loadMorePhotos()
  }
}
onMounted(() => {
  window.addEventListener('scroll', onGalleryScroll, { passive: true })
  onGalleryScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onGalleryScroll))
watch(
  () => route.path,
  async () => {
    if (directPhotoOnly.value && !user.value?.isAdmin) {
      await refresh()
      onGalleryScroll()
    }
  },
)

const handleIndexChange = (newIndex: number) => {
  const photo = viewerPhotos.value[newIndex]
  if (!photo) return

  switchToIndex(newIndex)
  router.replace(`/${photo.id}`)
}

const handleClose = () => {
  closeViewer()

  // 如果是直接访问详情页面，关闭时返回首页
  if (isDirectAccess.value) {
    isDirectAccess.value = false
    router.replace('/')
  } else if (returnRoute.value) {
    // 如果有指定的返回路由，返回到该路由
    const destination = returnRoute.value
    clearReturnRoute()
    router.replace(destination)
  } else {
    // 否则使用历史记录或默认返回首页
    if (window.history.length > 1) {
      router.back()
    } else {
      router.replace('/')
    }
  }
}

watchEffect(() => {
  dayjs.locale('zh-Hans', dayjsLocale_zhCN)
  dayjs.locale('zh-Hant-TW', dayjsLocale_zhTW)
  dayjs.locale('zh-Hant-HK', dayjsLocale_zhHK)
  dayjs.locale(localeRef.value)
})

// 在全局级别提供筛选功能的状态管理
provide(
  'photosFiltering',
  reactive({
    activeFilters: {
      tags: [],
      cameras: [],
      lenses: [],
      cities: [],
      ratings: [],
    },
  }),
)
</script>

<template>
  <UApp>
    <div
      class="contents"
      :style="publicThemeStyle"
    >
      <NuxtLoadingIndicator />
      <PhotosProvider
        :photos="photos"
        :refresh="refresh"
        :status="status"
      >
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
        <ClientOnly>
          <PhotoViewer
            :photos="viewerPhotos"
            :current-index="currentPhotoIndex"
            :is-open="isViewerOpen"
            @close="handleClose"
            @index-change="handleIndexChange"
          />
          <DiscoveryCommandPalette />
        </ClientOnly>
      </PhotosProvider>
    </div>
  </UApp>
</template>

<style></style>
