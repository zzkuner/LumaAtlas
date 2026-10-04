<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
import type { NeededExif } from '../../../shared/types/photo'
import type { KVData } from './KVRenderer.vue'
import { formatCameraInfo, formatLensInfo } from '~/utils/camera'

interface Props {
  currentPhoto: Photo
  exifData?: NeededExif | null
  onClose?: () => void
}

interface Album {
  id: number
  title: string
  description: string | null
  coverPhotoId: string | null
  createdAt: Date
  updatedAt: Date
}

const dayjs = useDayjs()
const router = useRouter()
const { localizeExif } = useExifLocalization()

const props = defineProps<Props>()

// 获取照片所属的相册
const { data: _albums } = useFetch<Album[]>(
  () => `/api/photos/${props.currentPhoto.id}/albums`,
  {
    watch: [() => props.currentPhoto.id],
  },
)

const albums = computed(() => _albums.value || [])

// 格式化曝光时间
const formatExposureTime = (
  exposureTime: string | number | undefined,
): string => {
  if (!exposureTime) return ''

  let seconds: number

  if (typeof exposureTime === 'string') {
    if (exposureTime.includes('/')) {
      const parts = exposureTime.split('/')
      if (parts.length === 2 && parts[0] && parts[1]) {
        const numerator = parseFloat(parts[0])
        const denominator = parseFloat(parts[1])
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          seconds = numerator / denominator
        } else {
          return exposureTime
        }
      } else {
        return exposureTime
      }
    } else {
      seconds = parseFloat(exposureTime)
      if (isNaN(seconds)) {
        return exposureTime
      }
    }
  } else {
    seconds = exposureTime
  }

  if (seconds >= 1) {
    return `${seconds}s`
  } else {
    const denominator = Math.round(1 / seconds)
    return `1/${denominator}`
  }
}

const captureSummary = computed(() =>
  [
    {
      label: $t('exif.focal.length.equivalent'),
      value: props.exifData?.FocalLengthIn35mmFormat
        ? `${props.exifData.FocalLengthIn35mmFormat}mm`
        : null,
      icon: 'lucide:telescope',
    },
    {
      label: $t('exif.aperture'),
      value: props.exifData?.FNumber ? `f/${props.exifData.FNumber}` : null,
      icon: 'lucide:aperture',
    },
    {
      label: $t('exif.exposure.time'),
      value: props.exifData?.ExposureTime
        ? formatExposureTime(props.exifData.ExposureTime)
        : null,
      icon: 'lucide:timer',
    },
    {
      label: 'ISO',
      value: props.exifData?.ISO?.toString() || null,
      icon: 'lucide:sun-medium',
    },
  ].filter((item) => item.value),
)

// 格式化GPS坐标为两行显示
const formatGPSCoordinatesMultiLine = (
  latitude: number,
  longitude: number,
): string => {
  const latDirection = latitude >= 0 ? 'N' : 'S'
  const lngDirection = longitude >= 0 ? 'E' : 'W'

  const latDegrees = Math.abs(latitude)
  const lngDegrees = Math.abs(longitude)

  const latDeg = Math.floor(latDegrees)
  const latMin = Math.floor((latDegrees - latDeg) * 60)
  const latSec = ((latDegrees - latDeg) * 60 - latMin) * 60

  const lngDeg = Math.floor(lngDegrees)
  const lngMin = Math.floor((lngDegrees - lngDeg) * 60)
  const lngSec = ((lngDegrees - lngDeg) * 60 - lngMin) * 60

  return `${latDeg}°${latMin}'${latSec.toFixed(2)}"${latDirection}\n${lngDeg}°${lngMin}'${lngSec.toFixed(2)}"${lngDirection}`
}

const gpsCoordinates = computed(() => {
  // 优先使用数据库中存储的坐标
  if (props.currentPhoto.latitude && props.currentPhoto.longitude) {
    return {
      latitude: props.currentPhoto.latitude,
      longitude: props.currentPhoto.longitude,
    }
  }

  // 如果数据库中没有，尝试从EXIF数据中获取
  if (!props.exifData) return null
  const { GPSLatitude, GPSLongitude } = props.exifData
  if (GPSLatitude && GPSLongitude) {
    return {
      latitude: parseFloat(`${GPSLatitude}`),
      longitude: parseFloat(`${GPSLongitude}`),
    }
  }
  return null
})

const formatedExifData = computed<Record<string, KVData[]>>(() => {
  const sections: Record<string, KVData[]> = {}

  // 基本信息
  sections.basicInfo = [
    {
      title: $t('exif.sections.basic'),
      items: [
        props.currentPhoto.storageKey
          ? {
              label: $t('exif.filename'),
              value:
                props.currentPhoto.storageKey.split('/').pop() ||
                props.currentPhoto.storageKey,
              icon: 'tabler:file',
            }
          : null,
        props.currentPhoto.fileSize
          ? {
              label: $t('exif.fileSize'),
              value: formatBytes(props.currentPhoto.fileSize),
              icon: 'tabler:database',
            }
          : null,
        props.currentPhoto.width && props.currentPhoto.height
          ? {
              label: $t('exif.resolution'),
              value: `${props.currentPhoto.width} × ${props.currentPhoto.height}`,
              icon: 'tabler:dimensions',
            }
          : null,
        props.currentPhoto.width && props.currentPhoto.height
          ? {
              label: $t('exif.pixels'),
              value: `${((props.currentPhoto.width * props.currentPhoto.height) / 1000000).toFixed(2)} MP`,
              icon: 'tabler:grid-dots',
            }
          : null,
        props.exifData?.DateTimeOriginal
          ? {
              label: $t('exif.dateTaken.title'),
              value: dayjs(props.exifData.DateTimeOriginal).format('L LT'),
              icon: 'tabler:calendar',
            }
          : null,
        props.exifData?.ColorSpace
          ? {
              label: $t('exif.colorSpace.title'),
              value: localizeExif('colorSpace', props.exifData.ColorSpace),
              icon: 'tabler:palette',
            }
          : null,
        props.exifData?.Artist
          ? {
              label: $t('exif.artist'),
              value: props.exifData.Artist,
              icon: 'tabler:user',
            }
          : null,
        props.exifData?.Software
          ? {
              label: $t('exif.software'),
              value: props.exifData.Software,
              icon: 'tabler:app-window',
            }
          : null,
        props.exifData?.tz
          ? {
              label: $t('exif.tz'),
              value: props.exifData.tz,
              icon: 'tabler:world',
            }
          : null,
        props.currentPhoto.country
          ? {
              label: $t('exif.country'),
              value: props.currentPhoto.country,
              icon: 'tabler:map-pin',
            }
          : null,
        props.currentPhoto.city
          ? {
              label: $t('exif.city'),
              value: props.currentPhoto.city,
              icon: 'tabler:building',
            }
          : null,
        props.currentPhoto.latitude && props.currentPhoto.longitude
          ? {
              label: $t('exif.gps.title'),
              value: formatGPSCoordinatesMultiLine(
                props.currentPhoto.latitude,
                props.currentPhoto.longitude,
              ),
              icon: 'tabler:gps',
            }
          : null,
      ],
    },
  ]

  // 拍摄参数
  sections.captureParams = [
    {
      title: $t('exif.sections.shooting.parameters'),
      items: [
        props.exifData?.FocalLengthIn35mmFormat
          ? {
              label: $t('exif.focal.length.actual'),
              value: `${props.exifData.FocalLengthIn35mmFormat}`,
              icon: 'tabler:telescope',
            }
          : null,
        props.exifData?.FNumber
          ? {
              label: $t('exif.aperture'),
              value: `f/${props.exifData.FNumber}`,
              icon: 'tabler:aperture',
            }
          : null,
        props.exifData?.ExposureTime
          ? {
              label: $t('exif.exposure.time'),
              value: formatExposureTime(props.exifData.ExposureTime),
              icon: 'tabler:clock',
            }
          : null,
        props.exifData?.ISO
          ? {
              label: 'ISO',
              value: props.exifData.ISO.toString(),
              icon: 'tabler:sun-electricity',
            }
          : null,
      ],
    },
  ]

  // 设备信息
  sections.deviceInfo = [
    {
      title: $t('exif.sections.deviceInfomation'),
      items: [
        props.exifData?.Make && props.exifData?.Model
          ? {
              label: $t('exif.camera'),
              value: formatCameraInfo(
                props.exifData.Make,
                props.exifData.Model,
              ),
              icon: 'tabler:camera',
            }
          : null,
        props.exifData?.LensModel
          ? {
              label: $t('exif.lens'),
              value: formatLensInfo(
                props.exifData.LensMake,
                props.exifData.LensModel,
              ),
              icon: 'tabler:focus',
            }
          : null,
        props.exifData?.MaxApertureValue
          ? {
              label: $t('exif.maxAperture'),
              value: `f/${props.exifData.MaxApertureValue}`,
              icon: 'tabler:aperture',
            }
          : null,
        props.exifData?.FocalLength
          ? {
              label: $t('exif.focal.length.actual'),
              value: props.exifData.FocalLength,
              icon: 'tabler:telescope',
            }
          : null,
        props.exifData?.FocalLengthIn35mmFormat
          ? {
              label: $t('exif.focal.length.equivalent'),
              value: props.exifData.FocalLengthIn35mmFormat,
              icon: 'tabler:zoom-in-area',
            }
          : null,
      ],
    },
  ]

  // 拍摄模式
  sections.captureMode = [
    {
      title: $t('exif.sections.shooting.mode'),
      items: [
        props.exifData?.WhiteBalance
          ? {
              label: $t('exif.wb.title'),
              value: localizeExif('whiteBalance', props.exifData.WhiteBalance),
              icon: 'mdi:white-balance-auto',
            }
          : null,
        props.exifData?.WBShiftAB
          ? {
              label: $t('exif.wb.shiftAB'),
              value: `${props.exifData.WBShiftAB}`,
              icon: 'mdi:white-balance-auto',
            }
          : null,
        props.exifData?.WBShiftGM
          ? {
              label: $t('exif.wb.shiftGM'),
              value: `${props.exifData.WBShiftGM}`,
              icon: 'mdi:white-balance-auto',
            }
          : null,
        props.exifData?.WhiteBalanceBias
          ? {
              label: $t('exif.wb.bias'),
              value: `${props.exifData.WhiteBalanceBias}`,
              icon: 'mdi:white-balance-auto',
            }
          : null,
        props.exifData?.WhiteBalanceFineTune
          ? {
              label: $t('exif.wb.fineTune'),
              value: `${props.exifData.WhiteBalanceFineTune}`,
              icon: 'mdi:white-balance-auto',
            }
          : null,
        props.exifData?.ExposureProgram
          ? {
              label: $t('exif.exposure.program'),
              value: localizeExif(
                'exposureProgram',
                props.exifData.ExposureProgram,
              ),
              icon: 'tabler:exposure',
            }
          : null,
        props.exifData?.ExposureMode
          ? {
              label: $t('exif.exposure.mode'),
              value: localizeExif('exposureMode', props.exifData.ExposureMode),
              icon: 'tabler:exposure-filled',
            }
          : null,
        props.exifData?.MeteringMode
          ? {
              label: $t('exif.metering.title'),
              value: localizeExif('meteringMode', props.exifData.MeteringMode),
              icon: 'tabler:focus-auto',
            }
          : null,
        props.exifData?.Flash
          ? {
              label: $t('exif.flash.title'),
              value: localizeExif('flash', props.exifData.Flash),
              icon: 'material-symbols:flash-on-rounded',
            }
          : null,
        props.exifData?.FlashMeteringMode
          ? {
              label: $t('exif.flash.meteringMode'),
              value: localizeExif(
                'meteringMode',
                props.exifData.FlashMeteringMode,
              ),
              icon: 'material-symbols:flash-on-rounded',
            }
          : null,
        props.exifData?.SceneCaptureType
          ? {
              label: $t('exif.scene.captureType'),
              value: localizeExif(
                'sceneCaptureType',
                props.exifData.SceneCaptureType,
              ),
              icon: 'material-symbols:scene',
            }
          : null,
      ],
    },
  ]

  // 技术参数
  sections.technicalParams = [
    {
      title: $t('exif.sections.specification'),
      items: [
        props.exifData?.BrightnessValue
          ? {
              label: $t('exif.brightness.value'),
              value: `${props.exifData.BrightnessValue.toFixed(1)} EV`,
              icon: 'tabler:sun',
            }
          : null,
        props.exifData?.SensingMethod
          ? {
              label: $t('exif.sensing.method'),
              value: localizeExif(
                'sensingMethod',
                props.exifData.SensingMethod,
              ),
              icon: 'tabler:photo-sensor',
            }
          : null,
        props.exifData?.FocalPlaneXResolution &&
        props.exifData?.FocalPlaneYResolution
          ? {
              label: $t('exif.focal.plane.resolution'),
              value: `${props.exifData.FocalPlaneXResolution.toFixed(2)} x ${props.exifData.FocalPlaneYResolution.toFixed(2)}`,
              icon: 'tabler:photo-sensor',
            }
          : null,
      ],
    },
  ]

  return sections
})

const isMobile = useMediaQuery('(max-width: 768px)')

const onMinimapClick = (photoId: string) => {
  window.open(`/globe?photoId=${photoId}`)
}

const onTagClick = (tag: string) => {
  router.push({
    path: '/',
    query: { tag },
  })
}

const onAlbumClick = (albumId: number) => {
  window.open(`/albums/${albumId}`)
}
</script>

<template>
  <motion.div
    :initial="{
      opacity: 0,
      x: isMobile ? 0 : 80,
      y: isMobile ? 20 : 0,
    }"
    :animate="{
      opacity: 1,
      x: 0,
      y: 0,
    }"
    :exit="{
      opacity: 0,
      x: isMobile ? 0 : 80,
      y: isMobile ? 20 : 0,
    }"
    :transition="{ type: 'spring', duration: 0.4, bounce: 0, delay: 0.1 }"
    class="border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
    :class="{
      'fixed inset-x-2 bottom-2 z-50 flex max-h-[78vh] flex-col rounded-md border shadow-2xl':
        isMobile,
      'w-[23rem] border-l': !isMobile,
    }"
  >
    <div
      class="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {{ currentPhoto.city || currentPhoto.country || $t('title.gallery') }}
        </p>
        <h3 class="mt-1 truncate text-base font-semibold">
          {{ currentPhoto.title }}
        </h3>
      </div>
      <UButton
        v-if="isMobile && onClose"
        icon="lucide:x"
        variant="ghost"
        color="neutral"
        class="rounded-md"
        size="sm"
        aria-label="Close"
        @click="onClose"
      />
    </div>

    <!-- 内容区域 -->
    <div
      class="min-h-0 flex-1 space-y-6 p-5"
      :class="{
        'overflow-y-auto': isMobile,
        'overflow-y-auto max-h-full pb-16': !isMobile,
      }"
    >
      <!-- 照片描述 -->
      <div
        v-if="currentPhoto.description"
        class="text-sm leading-6 text-neutral-600 dark:text-neutral-400"
      >
        {{ currentPhoto.description }}
      </div>

      <div
        v-if="captureSummary.length"
        class="grid grid-cols-2 border-y border-neutral-200 dark:border-neutral-800"
      >
        <div
          v-for="(item, index) in captureSummary"
          :key="item.label"
          class="flex min-w-0 items-start justify-between gap-3 py-3"
          :class="[
            index % 2 === 0
              ? 'border-r border-neutral-200 pr-3 dark:border-neutral-800'
              : 'pl-3',
            index > 1
              ? 'border-t border-neutral-200 dark:border-neutral-800'
              : '',
          ]"
        >
          <div class="min-w-0">
            <p
              class="truncate text-[11px] text-neutral-500 dark:text-neutral-400"
            >
              {{ item.label }}
            </p>
            <p class="mt-1 truncate text-base font-semibold">
              {{ item.value }}
            </p>
          </div>
          <Icon
            :name="item.icon"
            class="mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500"
          />
        </div>
      </div>

      <PhotoMiniMap
        v-if="gpsCoordinates"
        :photo="currentPhoto"
        :latitude="gpsCoordinates?.latitude"
        :longitude="gpsCoordinates?.longitude"
        class="cursor-pointer"
        @click="onMinimapClick(currentPhoto.id)"
      />

      <PhotoKVRenderer
        v-if="formatedExifData.basicInfo"
        :data="formatedExifData.basicInfo"
      />

      <div
        v-if="currentPhoto.exif?.Rating"
        class="flex items-center justify-between gap-2"
      >
        <h4
          class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400"
        >
          {{ $t('exif.sections.rating') }}
        </h4>

        <Rating
          :model-value="currentPhoto.exif.Rating"
          readonly
          size="sm"
        />
      </div>

      <!-- 相册 -->
      <div
        v-if="albums && albums.length > 0"
        class="space-y-3"
      >
        <h4
          class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400"
        >
          {{ $t('exif.sections.albums') }}
        </h4>
        <div class="border-y border-neutral-200 dark:border-neutral-800">
          <button
            v-for="album in albums"
            :key="album.id"
            type="button"
            class="block w-full border-b border-neutral-200 py-3 text-left transition-colors last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            @click="onAlbumClick(album.id)"
          >
            <p class="line-clamp-1 text-sm font-medium">
              {{ album.title }}
            </p>
            <p
              v-if="album.description"
              class="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400"
            >
              {{ album.description }}
            </p>
          </button>
        </div>
      </div>

      <!-- 标签 -->
      <div
        v-if="currentPhoto.tags && currentPhoto.tags.length > 0"
        class="space-y-3"
      >
        <h4
          class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400"
        >
          {{ $t('exif.sections.tags') }}
        </h4>
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="tag in currentPhoto.tags"
            :key="tag"
            :label="tag"
            variant="soft"
            size="sm"
            color="neutral"
            class="cursor-pointer rounded-md bg-neutral-100 text-neutral-700 transition-colors select-none hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="onTagClick(tag)"
          />
        </div>
      </div>
      <PhotoKVRenderer
        v-if="formatedExifData.captureParams"
        :data="formatedExifData.captureParams"
      />

      <div class="space-y-2">
        <h4
          class="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400"
        >
          {{ $t('exif.sections.histogram') }}
        </h4>

        <Histogram
          v-if="currentPhoto.thumbnailUrl"
          :thumbnail-url="currentPhoto.thumbnailUrl"
        />
      </div>

      <PhotoKVRenderer
        v-if="formatedExifData.deviceInfo"
        :data="formatedExifData.deviceInfo"
      />

      <PhotoKVRenderer
        v-if="formatedExifData.captureMode"
        :data="formatedExifData.captureMode"
      />

      <PhotoKVRenderer
        v-if="formatedExifData.technicalParams"
        :data="formatedExifData.technicalParams"
      />
    </div>
  </motion.div>
</template>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgb(163 163 163 / 0.55);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgb(115 115 115 / 0.75);
}
</style>
