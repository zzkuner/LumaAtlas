import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from '~~/server/services/auth/totp'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { code } = await readValidatedBody(
    event,
    z.object({ code: z.string().trim().min(6).max(8) }).parse,
  )
  const db = useDB()
  const factor = db
    .select()
    .from(tables.authFactors)
    .where(
      and(
        eq(tables.authFactors.userId, session.user.id),
        eq(tables.authFactors.type, 'totp'),
        eq(tables.authFactors.enabled, true),
      ),
    )
    .get()
  if (!factor || !verifyTotp(decryptTotpSecret(factor.secret), code)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid verification code',
    })
  }

  const recoveryCodes = generateRecoveryCodes()
  db.transaction((tx) => {
    tx.delete(tables.authRecoveryCodes)
      .where(eq(tables.authRecoveryCodes.userId, session.user.id))
      .run()
    tx.insert(tables.authRecoveryCodes)
      .values(
        recoveryCodes.map((recoveryCode) => ({
          userId: session.user.id,
          codeHash: hashRecoveryCode(recoveryCode),
        })),
      )
      .run()
  })
  return { recoveryCodes }
})
