import { desc, eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const items = useDB()
    .select()
    .from(tables.authSessions)
    .where(eq(tables.authSessions.userId, session.user.id))
    .orderBy(desc(tables.authSessions.lastSeenAt))
    .all()

  return items.map((item) => ({
    id: item.id,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    createdAt: item.createdAt,
    lastSeenAt: item.lastSeenAt,
    expiresAt: item.expiresAt,
    revokedAt: item.revokedAt,
    current: item.id === session.sessionId,
  }))
})
