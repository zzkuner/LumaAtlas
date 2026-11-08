import { z } from 'zod'
import { establishUserSession } from '~~/server/services/auth/session'
import { settingsManager } from '~~/server/services/settings/settingsManager'
import { storageConfigSchema } from '~~/shared/types/storage'
import { useDB, tables, eq } from '~~/server/utils/db'

export default eventHandler(async (event) => {
  const wizardAccess = await requireWizardAccess(event, {
    allowAnonymousWithoutUser: true,
  })

  const body = await readValidatedBody(
    event,
    z.object({
      admin: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        username: z.string().min(2).default('admin'),
      }),
      site: z.object({
        title: z.string().min(1),
        slogan: z.string().optional(),
        avatarUrl: z.string().optional(),
        author: z.string().optional(),
      }),
      storage: z.object({
        name: z.string().min(1),
        config: storageConfigSchema,
      }),
      map: z
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
        ),
    }).parse,
  )

  const db = useDB()

  // 1. Handle Admin User
  let adminUser: typeof tables.users.$inferSelect | undefined
  const existingUser = wizardAccess.existingUser
  if (existingUser) {
    adminUser = existingUser
  } else {
    await db
      .insert(tables.users)
      .values({
        email: body.admin.email,
        username: body.admin.username,
        password: await hashPassword(body.admin.password),
        isAdmin: 1,
        createdAt: new Date(),
      })
      .run()
    adminUser = db
      .select()
      .from(tables.users)
      .where(eq(tables.users.email, body.admin.email))
      .get()
    // If a later setup step fails, the new admin can retry without being locked out.
    if (adminUser) await establishUserSession(event, adminUser)
  }

  // 2. Handle Site Settings
  await settingsManager.set('app', 'title', body.site.title)
  if (body.site.slogan)
    await settingsManager.set('app', 'slogan', body.site.slogan)
  if (body.site.avatarUrl)
    await settingsManager.set('app', 'avatarUrl', body.site.avatarUrl)
  if (body.site.author)
    await settingsManager.set('app', 'author', body.site.author)

  // A failed/retried setup must not create another copy of the same provider.
  const providers = await settingsManager.storage.getProviders()
  const matchingProvider = providers.find(
    (provider) =>
      provider.name === body.storage.name &&
      provider.provider === body.storage.config.provider &&
      JSON.stringify(provider.config) === JSON.stringify(body.storage.config),
  )
  const id =
    matchingProvider?.id ??
    (await settingsManager.storage.addProvider({
      name: body.storage.name,
      provider: body.storage.config.provider,
      config: body.storage.config,
    }))
  await settingsManager.set('storage', 'provider', id)

  // 4. Handle Map Settings
  await settingsManager.set('map', 'provider', body.map.provider)
  if (body.map.provider === 'mapbox') {
    await settingsManager.set('map', 'mapbox.token', body.map.token)
    if (body.map.style)
      await settingsManager.set('map', 'mapbox.style', body.map.style)
  } else {
    await settingsManager.set('map', 'maplibre.token', body.map.token)
    if (body.map.style)
      await settingsManager.set('map', 'maplibre.style', body.map.style)
  }

  // 5. Mark Complete
  await settingsManager.set('system', 'firstLaunch', false, undefined, true)

  return { success: true }
})
