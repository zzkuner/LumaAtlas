export const useViewerState = defineStore('photo-viewer-state', () => {
  const currentPhotoIndex = ref(0)
  const isViewerOpen = ref(false)
  const returnRoute = ref<string | null>(null)
  const isDirectAccess = ref(false)
  const sourcePhotoIds = ref<string[] | null>(null)

  const openViewer = (
    index: number,
    route?: string | null,
    photoIds?: string[] | null,
  ) => {
    currentPhotoIndex.value = index
    isViewerOpen.value = true
    sourcePhotoIds.value = photoIds?.length ? [...photoIds] : null
    if (route) {
      returnRoute.value = route
      isDirectAccess.value = false
    } else {
      isDirectAccess.value = true
    }
  }

  const switchToIndex = (index: number) => {
    currentPhotoIndex.value = index
  }

  const closeViewer = () => {
    isViewerOpen.value = false
    sourcePhotoIds.value = null
  }

  const clearReturnRoute = () => {
    returnRoute.value = null
  }

  return {
    currentPhotoIndex,
    isViewerOpen,
    returnRoute,
    isDirectAccess,
    sourcePhotoIds,
    openViewer,
    switchToIndex,
    closeViewer,
    clearReturnRoute,
  }
})
