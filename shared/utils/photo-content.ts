type PhotoContent = {
  title?: string | null
  description?: string | null
}

const normalizeText = (value: unknown) =>
  typeof value === 'string'
    ? value.replaceAll('\u0000', '').replaceAll(/\r\n?/g, '\n').trim()
    : ''

const isDevicePath = (value: string) =>
  /^(?:file|content):\/\//i.test(value) ||
  /^(?:\/[\w.-]+){2,}\/?/i.test(value) ||
  /^[a-z]:[\\/]/i.test(value)

const isGeneratedFileName = (value: string) =>
  /^(?:img|dsc|dji|pxl|mvimg|wx_camera|screenshot|screen[_ -]?shot|camera)[_ -]?\d[\w.-]*$/i.test(
    value,
  ) ||
  /^\d{8,}(?:\.[a-z0-9]{2,5})?$/i.test(value) ||
  /^[a-f\d]{24,}(?:\.[a-z0-9]{2,5})?$/i.test(value)

const technicalFieldPattern =
  /\b(?:filter(?:intensity|mask)?|captureorientation|nicerunstatus|hdrforward|shaking|highlight|motionr|algolist|multi-frame|bokeh|brp_[\w-]+)\s*[:=]/i

const isTechnicalPayload = (value: string) => {
  if (technicalFieldPattern.test(value)) return true

  const fieldCount = value.match(/(?:^|[;\n])\s*[\w-]{2,}\s*[:=]/g)?.length || 0
  return fieldCount >= 3
}

export const sanitizePhotoTitle = (value: unknown) => {
  const title = normalizeText(value)
  if (!title || title.length > 300) return ''
  if (isDevicePath(title) || isGeneratedFileName(title)) return ''
  if (isTechnicalPayload(title)) return ''
  return title
}

export const sanitizePhotoDescription = (value: unknown) => {
  const description = normalizeText(value)
  if (!description || description.length > 4000) return ''
  if (isDevicePath(description) || isTechnicalPayload(description)) return ''
  return description
}

export const sanitizePhotoContent = <T extends PhotoContent>(photo: T): T => ({
  ...photo,
  title: sanitizePhotoTitle(photo.title),
  description: sanitizePhotoDescription(photo.description),
})
