import { describe, expect, it } from 'vitest'

import {
  applySettingsFieldsToState,
  getChangedSettingFields,
} from '../../app/utils/settingsForm'

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

describe('getChangedSettingFields', () => {
  it('submits only edited settings and preserves hidden provider fields', () => {
    const state = {
      provider: 'mapbox',
      'mapbox.token': 'existing-token',
      'maplibre.token': 'hidden-token',
    }
    const mapFields = [
      { key: 'provider', value: 'maplibre' },
      { key: 'mapbox.token', value: 'existing-token' },
      { key: 'maplibre.token', value: 'hidden-token' },
    ]

    expect(getChangedSettingFields(state, mapFields)).toEqual({
      provider: 'mapbox',
    })
  })
})
