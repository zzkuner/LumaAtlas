const commandPaletteOpen = ref(false)

export const useCommandPalette = () => {
  const openCommandPalette = () => {
    commandPaletteOpen.value = true
  }

  const closeCommandPalette = () => {
    commandPaletteOpen.value = false
  }

  return {
    isCommandPaletteOpen: commandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
  }
}
