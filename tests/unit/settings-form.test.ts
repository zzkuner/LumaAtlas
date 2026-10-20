import { describe, expect, it } from 'vitest'

import { applySettingsFieldsToState } from '../../app/utils/settingsForm'

const fields = [
  { key: 'title', value: 'Saved title' },
  { key: 'layout', value: 'masonry', defaultValue: 'grid' },
]

describe('applySettingsFieldsToState', () => {
  it('initializes the complete form state', () => {
    const state: Record<string, unknown> = {}
    applySettingsFieldsToState(state, fields)
    expect(state).toEqual({ title: 'Saved title', layout: 'masonry' })
  })

  it('refreshes submitted fields without deleting another section draft', () => {
    const state: Record<string, unknown> = {
      title: 'Draft title',
      layout: 'grid',
    }

    applySettingsFieldsToState(state, fields, {
      preserveState: true,
      refreshKeys: new Set(['title']),
    })

    expect(state).toEqual({ title: 'Saved title', layout: 'grid' })
  })
})
