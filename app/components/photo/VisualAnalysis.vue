<script setup lang="ts">
interface VisualAnalysis {
  colors: Array<{ hex: string; percent: number }>
  brightness: number
  contrast: number
  saturation: number
  temperature: 'cool' | 'neutral' | 'warm'
  tone: 'dark' | 'balanced' | 'bright'
}

const props = defineProps<{ thumbnailUrl: string }>()
const analysis = ref<VisualAnalysis | null>(null)
const loading = ref(true)

const toHex = (value: number) => value.toString(16).padStart(2, '0')
const colorDistance = (a: number[], b: number[]) =>
  Math.sqrt((a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2)

const analyze = async () => {
  if (!import.meta.client) return
  loading.value = true
  analysis.value = null

  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = new URL(props.thumbnailUrl, window.location.origin).toString()

  try {
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 48
    canvas.height = 48
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const buckets = new Map<string, { rgb: number[]; count: number }>()
    const luminance: number[] = []
    let saturationTotal = 0
    let redTotal = 0
    let blueTotal = 0
    let sampled = 0

    for (let index = 0; index < pixels.length; index += 16) {
      const alpha = pixels[index + 3] || 0
      if (alpha < 128) continue
      const red = pixels[index] || 0
      const green = pixels[index + 1] || 0
      const blue = pixels[index + 2] || 0
      const max = Math.max(red, green, blue)
      const min = Math.min(red, green, blue)
      const light = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      luminance.push(light)
      saturationTotal += max === 0 ? 0 : (max - min) / max
      redTotal += red
      blueTotal += blue
      sampled++

      const quantized = [red, green, blue].map((value) =>
        Math.min(255, Math.round(value / 32) * 32),
      )
      const key = quantized.join(',')
      const bucket = buckets.get(key)
      if (bucket) bucket.count++
      else buckets.set(key, { rgb: quantized, count: 1 })
    }

    if (!sampled) return
    const average = luminance.reduce((sum, value) => sum + value, 0) / sampled
    const variance =
      luminance.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      sampled
    const colors: Array<{ rgb: number[]; count: number }> = []

    for (const bucket of [...buckets.values()].sort(
      (a, b) => b.count - a.count,
    )) {
      if (colors.every((color) => colorDistance(color.rgb, bucket.rgb) > 56)) {
        colors.push(bucket)
      }
      if (colors.length === 5) break
    }

    analysis.value = {
      colors: colors.map(({ rgb, count }) => ({
        hex: `#${toHex(rgb[0]!)}${toHex(rgb[1]!)}${toHex(rgb[2]!)}`,
        percent: Math.round((count / sampled) * 100),
      })),
      brightness: Math.round((average / 255) * 100),
      contrast: Math.round((Math.sqrt(variance) / 128) * 100),
      saturation: Math.round((saturationTotal / sampled) * 100),
      temperature:
        redTotal / sampled - blueTotal / sampled > 10
          ? 'warm'
          : blueTotal / sampled - redTotal / sampled > 10
            ? 'cool'
            : 'neutral',
      tone: average < 85 ? 'dark' : average > 175 ? 'bright' : 'balanced',
    }
  } catch {
    analysis.value = null
  } finally {
    loading.value = false
  }
}

watch(() => props.thumbnailUrl, analyze, { immediate: true })
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="loading"
      class="h-20 animate-pulse bg-neutral-100 dark:bg-neutral-900"
    />
    <template v-else-if="analysis">
      <div
        class="flex h-9 overflow-hidden border border-neutral-200 dark:border-neutral-800"
      >
        <div
          v-for="color in analysis.colors"
          :key="color.hex"
          class="group relative flex-1"
          :style="{ backgroundColor: color.hex }"
          :title="`${color.hex} · ${color.percent}%`"
        />
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <div class="flex justify-between text-neutral-500">
            <span>{{ $t('photoDetail.analysis.brightness') }}</span>
            <span>{{ analysis.brightness }}%</span>
          </div>
          <div class="mt-1 h-1 bg-neutral-100 dark:bg-neutral-800">
            <div
              class="h-full bg-neutral-700 dark:bg-neutral-300"
              :style="{ width: `${analysis.brightness}%` }"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between text-neutral-500">
            <span>{{ $t('photoDetail.analysis.contrast') }}</span>
            <span>{{ analysis.contrast }}%</span>
          </div>
          <div class="mt-1 h-1 bg-neutral-100 dark:bg-neutral-800">
            <div
              class="h-full bg-neutral-700 dark:bg-neutral-300"
              :style="{ width: `${Math.min(analysis.contrast, 100)}%` }"
            />
          </div>
        </div>
        <p class="text-neutral-500">
          {{ $t('photoDetail.analysis.tone') }}:
          <span class="text-neutral-900 dark:text-white">{{
            $t(`photoDetail.analysis.${analysis.tone}`)
          }}</span>
        </p>
        <p class="text-neutral-500">
          {{ $t('photoDetail.analysis.temperature') }}:
          <span class="text-neutral-900 dark:text-white">{{
            $t(`photoDetail.analysis.${analysis.temperature}`)
          }}</span>
        </p>
      </div>
    </template>
  </div>
</template>
