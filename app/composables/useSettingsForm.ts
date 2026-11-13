import type {
  FieldDescriptor,
  SettingsFieldsResponse,
} from '~~/shared/types/settings'

/**
 * Settings Form Composable
 * 统一处理获取字段描述、管理表单状态、提交更新
 * 避免在各个页面中重复实现相同逻辑
 *
 * @param namespace 设置命名空间（如 'app', 'map', 'location', 'storage'）
 * @returns 字段列表、表单状态、加载状态、错误状态和提交函数
 *
 * @example
 * const { fields, state, submit, loading } = useSettingsForm('app')
 */
export function useSettingsForm(namespace: string) {
  const toast = useToast()

  const fields = ref<FieldDescriptor[]>([])
  const state = reactive<Record<string, any>>({})
  // Start in loading state to avoid first-paint empty container before skeleton.
  const loading = ref(true)
  const error = ref<string | null>(null)

  /**
   * 从 API 获取字段描述和当前值
   */
  const fetchFields = async (options?: {
    preserveState?: boolean
    refreshKeys?: ReadonlySet<string>
    silent?: boolean
  }) => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<SettingsFieldsResponse>(
        '/api/system/settings/fields',
        {
          query: { namespace },
        },
      )

      fields.value = response.fields

      applySettingsFieldsToState(state, response.fields, options)
      return true
    } catch (err) {
      const message = (err as Error).message
      error.value = message
      if (!options?.silent) {
        toast.add({
          title: '加载设置失败',
          description: message,
          color: 'error',
        })
      }
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 提交表单更新
   * 支持单条或多条更新
   *
   * @param data 要更新的字段数据
   * @example
   * await submit({ title: 'New Title', slogan: 'New Slogan' })
   */
  const submit = async (data: Record<string, any>) => {
    if (Object.keys(data).length === 0) return
    loading.value = true
    error.value = null

    try {
      // 准备批量更新请求
      const updates = Object.entries(data).map(([key, value]) => ({
        namespace,
        key,
        value,
      }))

      const result = await $fetch<{ success: boolean }>(
        '/api/system/settings/batch',
        {
          method: 'PUT',
          body: { updates },
        },
      )
      if (!result.success) throw new Error('部分设置未保存，请刷新后重试')

      fields.value = applySubmittedSettingsToFields(fields.value, data)

      let synchronized = true
      try {
        await refreshSettings()
      } catch {
        synchronized = false
      }

      // Refresh submitted values and their baselines without discarding drafts
      // from other sections that share the same settings namespace.
      const fieldsRefreshed = await fetchFields({
        preserveState: true,
        refreshKeys: new Set(Object.keys(data)),
        silent: true,
      })
      if (!fieldsRefreshed) synchronized = false

      toast.add({
        title: synchronized ? '设置已保存' : '设置已保存，页面状态未完全同步',
        description: synchronized ? undefined : '请刷新页面确认最新设置。',
        color: synchronized ? 'success' : 'warning',
      })
    } catch (err) {
      const message = (err as Error).message
      error.value = message
      toast.add({
        title: '保存设置失败',
        description: message,
        color: 'error',
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置表单状态为当前字段值
   */
  const reset = () => {
    fields.value.forEach((field) => {
      state[field.key] = field.value ?? field.defaultValue ?? null
    })
  }

  /**
   * 更新特定字段的状态
   * 用于处理字段依赖关系或条件显示
   */
  const updateField = (fieldKey: string, value: any) => {
    state[fieldKey] = value
  }

  /**
   * 获取特定字段
   */
  const getField = (fieldKey: string): FieldDescriptor | undefined => {
    return fields.value.find((f) => f.key === fieldKey)
  }

  /**
   * 获取字段的当前值
   */
  const getFieldValue = (fieldKey: string): any => {
    return state[fieldKey]
  }

  // 组件挂载时自动获取字段
  onMounted(() => {
    fetchFields()
  })

  return {
    // 数据
    fields: readonly(fields),
    state,

    // 状态
    loading: readonly(loading),
    error: readonly(error),

    // 方法
    submit,
    reset,
    fetchFields,
    updateField,
    getField,
    getFieldValue,
  }
}
