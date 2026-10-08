import { desc, eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  return useDB()
    .select({
      id: tables.passkeys.id,
      name: tables.passkeys.name,
      deviceType: tables.passkeys.deviceType,
      backedUp: tables.passkeys.backedUp,
      createdAt: tables.passkeys.createdAt,
      lastUsedAt: tables.passkeys.lastUsedAt,
    })
    .from(tables.passkeys)
    .where(eq(tables.passkeys.userId, session.user.id))
    .orderBy(desc(tables.passkeys.createdAt))
    .all()
})
