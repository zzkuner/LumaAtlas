type SettingFieldValue = {
  key: string
  value?: unknown
  defaultValue?: unknown
}

export const resolvedSettingFieldValue = (field: SettingFieldValue) =>
  field.value ?? field.defaultValue ?? null

export const getChangedSettingFields = (
  state: Record<string, unknown>,
  fields: readonly SettingFieldValue[],
) =>
  Object.fromEntries(
    fields
      .filter(
        (field) =>
          JSON.stringify(state[field.key] ?? null) !==
          JSON.stringify(resolvedSettingFieldValue(field)),
      )
      .map((field) => [field.key, state[field.key]]),
  )

export const applySubmittedSettingsToFields = <T extends SettingFieldValue>(
  fields: T[],
  submitted: Record<string, unknown>,
): T[] =>
  fields.map((field) =>
    Object.hasOwn(submitted, field.key)
      ? { ...field, value: submitted[field.key] }
      : field,
  )

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
