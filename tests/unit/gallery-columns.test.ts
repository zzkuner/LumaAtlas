import { describe, expect, it } from 'vitest'
import {
  availableGalleryColumns,
  effectiveGalleryColumns,
} from '../../app/utils/gallery-columns'

describe('gallery columns', () => {
  it('only offers columns that fit the current gallery width', () => {
    expect(availableGalleryColumns(296, 12, true)).toBe(2)
    expect(availableGalleryColumns(250, 12, true)).toBe(1)
    expect(availableGalleryColumns(610, 12, false)).toBe(4)
    expect(availableGalleryColumns(1500, 12, false)).toBe(8)
  })

  it('adapts saved preferences without losing their original value', () => {
    expect(effectiveGalleryColumns(6, 2)).toBe(2)
    expect(effectiveGalleryColumns(1, 2)).toBe(1)
  })
})
