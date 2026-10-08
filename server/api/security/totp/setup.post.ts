import { and, eq } from 'drizzle-orm'
import {
  createTotpSetup,
  encryptTotpSecret,
  generateTotpSecret,
} from '~~/server/services/auth/totp'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const secret = generateTotpSecret()
  const encryptedSecret = encryptTotpSecret(secret)
  const issuer = String(
    (useRuntimeConfig(event) as any).public?.app?.title || 'LumaAtlas',
  )
  const db = useDB()
  const existing = db
    .select({ id: tables.authFactors.id })
    .from(tables.authFactors)
    .where(
      and(
        eq(tables.authFactors.userId, session.user.id),
        eq(tables.authFactors.type, 'totp'),
      ),
    )
    .get()

  if (existing) {
    db.update(tables.authFactors)
      .set({ secret: encryptedSecret, enabled: false, verifiedAt: null })
      .where(eq(tables.authFactors.id, existing.id))
      .run()
  } else {
    db.insert(tables.authFactors)
      .values({
        userId: session.user.id,
        type: 'totp',
        secret: encryptedSecret,
      })
      .run()
  }

  return createTotpSetup(secret, session.user.email, issuer)
})
