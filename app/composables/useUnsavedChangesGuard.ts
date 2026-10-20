import type { MaybeRefOrGetter } from 'vue'
import { onBeforeUnmount, onMounted, toValue } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const DEFAULT_MESSAGE = '当前页面还有未保存的修改，确定要离开吗？'

export const useUnsavedChangesGuard = (
  isDirty: MaybeRefOrGetter<boolean>,
  message = DEFAULT_MESSAGE,
) => {
  const confirmLeave = () => !toValue(isDirty) || window.confirm(message)
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!toValue(isDirty)) return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(() => {
    if (import.meta.server) return true
    return confirmLeave()
  })

  onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
  onBeforeUnmount(() =>
    window.removeEventListener('beforeunload', handleBeforeUnload),
  )
}
