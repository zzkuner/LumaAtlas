export function availableGalleryColumns(
  width: number,
  gap: number,
  compact: boolean,
): number {
  if (!Number.isFinite(width) || width <= 0) return compact ? 2 : 8

  const safeGap = Math.max(0, gap)
  const count = Math.floor((width + safeGap) / (140 + safeGap))
  return Math.max(1, Math.min(compact ? 2 : 8, count))
}

export function effectiveGalleryColumns(
  selected: number,
  available: number,
): number {
  return Math.max(1, Math.min(selected, available))
}
