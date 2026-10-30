import type { H3Event } from 'h3'
import { settingsManager } from '~~/server/services/settings/settingsManager'

export const requireWizardAccess = async (
  event: H3Event,
  options: { allowAnonymousWithoutUser?: boolean } = {},
) => {
  const isFirstLaunch = await settingsManager.get<boolean>(
    'system',
    'firstLaunch',
    true,
  )

  if (isFirstLaunch !== true) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Setup wizard is not available',
    })
  }

  const existingUser = useDB().select().from(tables.users).limit(1).get()
  if (!existingUser && options.allowAnonymousWithoutUser) {
    return { existingUser: null, session: null }
  }

  if (!existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Create the administrator account first',
    })
  }

  const session = await requireAdminSession(event)
  return { existingUser, session }
}
