import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { sessionId } = await getValidatedRouterParams(
    event,
    z.object({ sessionId: z.string().min(20).max(100) }).parse,
  )
  const result = useDB()
    .update(tables.authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(tables.authSessions.id, sessionId),
        eq(tables.authSessions.userId, session.user.id),
      ),
    )
    .run()
  if (!result.changes) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }
  if (session.sessionId === sessionId) {
    await clearUserSession(event)
  }
  return { revoked: true, current: session.sessionId === sessionId }
})
