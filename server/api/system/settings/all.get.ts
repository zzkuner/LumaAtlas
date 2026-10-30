import { isPublicSetting } from '~~/server/services/settings/access'
import { useDB, tables } from '~~/server/utils/db'

/**
 * 获取所有公开设置
 * 仅返回 isPublic=true 的设置，按命名空间分组
 * 特例：始终返回 system:firstLaunch 以便前端判断是否需要初始化
 */
export default eventHandler(async () => {
  const db = useDB()

  // The code-owned schema is authoritative. Database flags can be stale after
  // an upgrade, so never use them alone to decide whether a value is public.
  const allSettings = db.select().from(tables.settings).all()

  // 按命名空间分组
  const grouped: Record<string, Record<string, any>> = {}

  for (const setting of allSettings) {
    const isFirstLaunch =
      setting.namespace === 'system' && setting.key === 'firstLaunch'
    if (!isFirstLaunch && !isPublicSetting(setting.namespace, setting.key)) {
      continue
    }

    const namespaceSettings = (grouped[setting.namespace] ??= {})

    // 解析值
    let value: any = setting.value
    try {
      if (setting.type === 'json') {
        value = setting.value ? JSON.parse(setting.value) : null
      } else if (setting.type === 'number') {
        value = setting.value ? Number(setting.value) : null
      } else if (setting.type === 'boolean') {
        value = setting.value === 'true' || setting.value === '1'
      }
    } catch {
      // 保持原始值
    }

    namespaceSettings[setting.key] = value
  }

  return {
    timestamp: Date.now(),
    data: grouped,
  }
})
