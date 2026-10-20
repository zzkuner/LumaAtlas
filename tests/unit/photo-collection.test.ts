import { describe, expect, it } from 'vitest'

import { resolvePhotoCollection } from '../../app/utils/photoCollection'

describe('resolvePhotoCollection', () => {
  const photos = [{ id: 'one' }, { id: 'two' }, { id: 'three' }]

  it('keeps the requested collection order', () => {
    expect(resolvePhotoCollection(photos, ['three', 'one'])).toEqual([
      { id: 'three' },
      { id: 'one' },
    ])
  })

  it('drops missing photos without falling back to the global collection', () => {
    expect(resolvePhotoCollection(photos, ['missing', 'two'])).toEqual([
      { id: 'two' },
    ])
  })

  it('uses the global collection when no source is active', () => {
    expect(resolvePhotoCollection(photos, null)).toBe(photos)
  })
})
