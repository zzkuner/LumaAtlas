import { DEFAULT_SETTINGS } from './contants'

const settingConfigByKey = new Map(
  DEFAULT_SETTINGS.map((setting) => [
    `${setting.namespace}:${setting.key}`,
    setting,
  ]),
)

export function getCanonicalSettingConfig(namespace: string, key: string) {
  return settingConfigByKey.get(`${namespace}:${key}`)
}

export function isPublicSetting(namespace: string, key: string): boolean {
  const config = getCanonicalSettingConfig(namespace, key)
  if (!config || !('isPublic' in config) || config.isPublic !== true) {
    return false
  }

  return !('isSecret' in config) || config.isSecret !== true
}
