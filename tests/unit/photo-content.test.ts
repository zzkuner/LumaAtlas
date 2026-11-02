import { describe, expect, it } from 'vitest'
import {
  sanitizePhotoContent,
  sanitizePhotoDescription,
  sanitizePhotoTitle,
} from '../../shared/utils/photo-content'

describe('photo content sanitization', () => {
  it('keeps intentional titles and descriptions', () => {
    expect(sanitizePhotoTitle('秋日山径')).toBe('秋日山径')
    expect(sanitizePhotoDescription('傍晚从山脚慢慢走到这里。')).toBe(
      '傍晚从山脚慢慢走到这里。',
    )
  })

  it('rejects generated file names and device paths', () => {
    expect(sanitizePhotoTitle('IMG_20261101_162818')).toBe('')
    expect(
      sanitizePhotoTitle('/storage/emulated/0/DCIM/Camera/IMG_20261101_162818'),
    ).toBe('')
    expect(sanitizePhotoTitle('1000003444')).toBe('')
  })

  it('rejects camera processing diagnostics', () => {
    expect(
      sanitizePhotoDescription(
        'filter: 2237; filterIntensity: 0; captureOrientation: 0; niceRunStatus: 19',
      ),
    ).toBe('')
  })

  it('sanitizes public photo records without changing other fields', () => {
    expect(
      sanitizePhotoContent({
        id: 'photo-1',
        title: 'IMG_20261101_162818',
        description: 'filter: 1; motionR: 0; bokeh: 1',
      }),
    ).toEqual({ id: 'photo-1', title: '', description: '' })
  })
})
