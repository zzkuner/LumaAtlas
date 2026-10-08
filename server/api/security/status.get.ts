import { and, count, eq, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const factor = useDB()
    .select({ enabled: tables.authFactors.enabled })
    .from(tables.authFactors)
    .where(
      and(
        eq(tables.authFactors.userId, userId),
        eq(tables.authFactors.type, 'totp'),
      ),
    )
    .get()
  const recoveryCodes =
    useDB()
      .select({ value: count() })
      .from(tables.authRecoveryCodes)
      .where(
        and(
          eq(tables.authRecoveryCodes.userId, userId),
          isNull(tables.authRecoveryCodes.usedAt),
        ),
      )
      .get()?.value || 0
  const passkeyCount =
    useDB()
      .select({ value: count() })
      .from(tables.passkeys)
      .where(eq(tables.passkeys.userId, userId))
      .get()?.value || 0

  return {
    totpEnabled: factor?.enabled === true,
    recoveryCodes,
    passkeyCount,
  }
})
