export const usePublicThemeStyle = () => {
  const accentColor = computed(() => {
    const value = String(
      getSetting('app:appearance.home.accentColor') || '#171717',
    )
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#171717'
  })

  const cornerRadius = computed(() => {
    const value = Number(getSetting('app:appearance.home.cornerRadius') ?? 2)
    return Math.max(0, Math.min(16, Number.isFinite(value) ? value : 2))
  })

  const headingFont = computed(() => {
    const value = getSetting('app:appearance.home.headingFont')
    if (value === 'serif') {
      return 'Georgia, Cambria, "Times New Roman", serif'
    }
    if (value === 'wenkai') {
      return 'var(--font-display)'
    }
    return 'var(--font-sans)'
  })

  return computed(() => ({
    '--la-accent': accentColor.value,
    '--la-radius': `${cornerRadius.value}px`,
    '--la-heading-font': headingFont.value,
  }))
}
