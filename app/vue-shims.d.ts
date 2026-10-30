import type { ColorModeInstance } from '@nuxtjs/color-mode'
import type dayjs from 'dayjs'
import type { Composer, ExportedGlobalComposer } from 'vue-i18n'
import type { Router } from 'vue-router'
import type { getSetting } from './stores/settings'
import type { formatBytes } from './utils'

interface LumaAtlasComponentProperties {
  $colorMode: ColorModeInstance
  $config: ReturnType<(typeof import('#app'))['useRuntimeConfig']>
  $dayjs: typeof dayjs
  $i18n: ExportedGlobalComposer
  $router: Router
  $t: Composer['t']
  formatBytes: typeof formatBytes
  getSetting: typeof getSetting
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties extends LumaAtlasComponentProperties {}
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $colorMode: LumaAtlasComponentProperties['$colorMode']
    $config: LumaAtlasComponentProperties['$config']
    $dayjs: LumaAtlasComponentProperties['$dayjs']
    $i18n: LumaAtlasComponentProperties['$i18n']
    $router: LumaAtlasComponentProperties['$router']
    $t: LumaAtlasComponentProperties['$t']
    formatBytes: LumaAtlasComponentProperties['formatBytes']
    getSetting: LumaAtlasComponentProperties['getSetting']
  }
}

export {}
