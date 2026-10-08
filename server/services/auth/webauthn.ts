import { randomBytes } from 'node:crypto'
import { lt } from 'drizzle-orm'
import type { H3Event } from 'h3'

export const getWebAuthnContext = (event: H3Event) => {
  const configured = String(
    (useRuntimeConfig(event) as any).public?.siteUrl || '',
  ).trim()
  const url = configured ? new URL(configured) : getRequestURL(event)
  return {
    origin: url.origin,
    rpID: url.hostname,
  }
}

export const storeWebAuthnChallenge = (
  type: 'registration' | 'authentication',
  challenge: string,
  userId?: number,
) => {
  const id = randomBytes(24).toString('base64url')
  const now = new Date()
  useDB()
    .delete(tables.webauthnChallenges)
    .where(lt(tables.webauthnChallenges.expiresAt, now))
    .run()
  useDB()
    .insert(tables.webauthnChallenges)
    .values({
      id,
      userId: userId ?? null,
      type,
      challenge,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    })
    .run()
  return id
}
