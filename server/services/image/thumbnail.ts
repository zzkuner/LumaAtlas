import sharp from 'sharp'
import { generateBlurHash } from './blurhash'
import { withRetry, RetryPresets } from '../../utils/retry'

export interface GeneratedThumbnailVariant {
  width: number
  height: number
  bytes: number
  buffer: Buffer
}

const normalizeWidths = (widths: number[]) =>
  [...new Set(widths.map((width) => Math.round(width)))]
    .filter((width) => width >= 160 && width <= 4096)
    .sort((left, right) => left - right)

export const generateThumbnailVariantsAndHash = async (
  buffer: Buffer,
  widths: number[],
  quality: number,
  logger?: Logger[keyof Logger],
) => {
  return await withRetry(
    async () => {
      const sharpInst = sharp(buffer).rotate()
      const normalizedWidths = normalizeWidths(widths)
      const outputQuality = Math.min(95, Math.max(40, Math.round(quality)))
      const variants: GeneratedThumbnailVariant[] = []
      const generatedWidths = new Set<number>()

      for (const width of normalizedWidths.length > 0
        ? normalizedWidths
        : [600]) {
        const { data, info } = await sharpInst
          .clone()
          .resize(width, null, {
            withoutEnlargement: true,
            fastShrinkOnLoad: false,
          })
          .webp({ quality: outputQuality, effort: 4 })
          .toBuffer({ resolveWithObject: true })

        if (generatedWidths.has(info.width)) continue
        generatedWidths.add(info.width)
        variants.push({
          width: info.width,
          height: info.height,
          bytes: info.size,
          buffer: data,
        })
      }

      if (variants.length === 0) {
        throw new Error('No thumbnail variants were generated')
      }

      logger?.info(
        `Generated ${variants.length} responsive thumbnails (${variants
          .map((variant) => `${variant.width}w`)
          .join(', ')}, quality: ${outputQuality})`,
      )

      const thumbnailHash = await generateBlurHash(variants[0]!.buffer, logger)

      return { variants, thumbnailHash }
    },
    {
      ...RetryPresets.standard,
      timeout: 30000,
      delayStrategy: 'linear',
    },
    logger,
  )
}
