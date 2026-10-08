import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session.sessionId) {
    useDB()
      .update(tables.authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(tables.authSessions.id, session.sessionId))
      .run()
  }
  await clearUserSession(event)
})
