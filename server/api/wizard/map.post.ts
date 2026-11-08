import { z } from 'zod'
import { settingsManager } from '~~/server/services/settings/settingsManager'

export default eventHandler(async (event) => {
  await requireWizardAccess(event, { allowAnonymousWithoutUser: true })

  const body = await readValidatedBody(
    event,
    z
      .object({
        provider: z.enum(['mapbox', 'maplibre']),
        token: z.string().default(''),
        style: z.string().optional(),
      })
      .refine(
        (map) => map.provider !== 'mapbox' || map.token.trim().length > 0,
        {
          path: ['token'],
          message: 'Mapbox requires an access token',
        },
      ).parse,
  )

  await settingsManager.set('map', 'provider', body.provider)

  if (body.provider === 'mapbox') {
    await settingsManager.set('map', 'mapbox.token', body.token)
    if (body.style) await settingsManager.set('map', 'mapbox.style', body.style)
  } else {
    await settingsManager.set('map', 'maplibre.token', body.token)
    if (body.style)
      await settingsManager.set('map', 'maplibre.style', body.style)
  }

  return { success: true }
})
