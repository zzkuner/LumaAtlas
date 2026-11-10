import type { H3Event } from 'h3'
import { settingsManager } from '~~/server/services/settings/settingsManager'
import { matchesSetupToken } from './setup-token'

export const requireWizardAccess = async (
  event: H3Event,
  options: {
    allowAnonymousWithoutUser?: boolean
    allowAnonymousSchema?: boolean
  } = {},
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
    if (options.allowAnonymousSchema) {
      return { existingUser: null, session: null }
    }
    const configuredToken = process.env.CFRAME_SETUP_TOKEN
    if (!configuredToken || configuredToken.length < 24) {
      throw createError({
        statusCode: 503,
        statusMessage:
          'Set CFRAME_SETUP_TOKEN (at least 24 characters) before first-time setup',
      })
    }
    const suppliedToken = getHeader(event, 'x-setup-token') || ''
    if (!matchesSetupToken(configuredToken, suppliedToken)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Invalid setup token',
      })
    }
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
