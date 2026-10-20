type SettingFieldValue = {
  key: string
  value?: unknown
  defaultValue?: unknown
}

export const resolvedSettingFieldValue = (field: SettingFieldValue) =>
  field.value ?? field.defaultValue ?? null

export const applySettingsFieldsToState = (
  state: Record<string, unknown>,
  fields: SettingFieldValue[],
  options?: {
    preserveState?: boolean
    refreshKeys?: ReadonlySet<string>
  },
) => {
  fields.forEach((field) => {
    const shouldRefreshState =
      !options?.preserveState ||
      options.refreshKeys?.has(field.key) ||
      !(field.key in state)

    if (shouldRefreshState) {
      state[field.key] = resolvedSettingFieldValue(field)
    }
  })
}
