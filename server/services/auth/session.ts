import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import type { User } from '~~/server/utils/db'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000

export const establishUserSession = async (event: H3Event, user: User) => {
  const db = useDB()
  const sessionId = randomBytes(24).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

  db.delete(tables.authSessions)
    .where(lt(tables.authSessions.expiresAt, now))
    .run()
  db.insert(tables.authSessions)
    .values({
      id: sessionId,
      userId: user.id,
      ipAddress: getRequestIP(event, { xForwardedFor: true }) || null,
      userAgent: getHeader(event, 'user-agent')?.slice(0, 500) || null,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    })
    .run()

  await setUserSession(
    event,
    { user, sessionId },
    {
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    },
  )

  return sessionId
}

export const isSessionActive = (sessionId: string) => {
  const now = new Date()
  return Boolean(
    useDB()
      .select({ id: tables.authSessions.id })
      .from(tables.authSessions)
      .where(
        and(
          eq(tables.authSessions.id, sessionId),
          isNull(tables.authSessions.revokedAt),
          gt(tables.authSessions.expiresAt, now),
        ),
      )
      .get(),
  )
}

export const touchAuthSession = (sessionId: string) => {
  const session = useDB()
    .select({ lastSeenAt: tables.authSessions.lastSeenAt })
    .from(tables.authSessions)
    .where(eq(tables.authSessions.id, sessionId))
    .get()
  if (session && Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    useDB()
      .update(tables.authSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(tables.authSessions.id, sessionId))
      .run()
  }
}
