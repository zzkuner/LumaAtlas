import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { establishUserSession } from '~~/server/services/auth/session'
import { getWebAuthnContext } from '~~/server/services/auth/webauthn'

export default eventHandler(async (event) => {
  const body = await readValidatedBody(
    event,
    z.object({
      challengeId: z.string().min(20),
      response: z.record(z.string(), z.unknown()),
    }).parse,
  )
  const db = useDB()
  const challenge = db
    .select()
    .from(tables.webauthnChallenges)
    .where(
      and(
        eq(tables.webauthnChallenges.id, body.challengeId),
        eq(tables.webauthnChallenges.type, 'authentication'),
        gt(tables.webauthnChallenges.expiresAt, new Date()),
      ),
    )
    .get()
  if (!challenge) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Passkey challenge expired',
    })
  }
  db.delete(tables.webauthnChallenges)
    .where(eq(tables.webauthnChallenges.id, challenge.id))
    .run()

  const response = body.response as unknown as AuthenticationResponseJSON
  const passkey = db
    .select()
    .from(tables.passkeys)
    .where(eq(tables.passkeys.credentialId, response.id))
    .get()
  if (!passkey) {
    throw createError({ statusCode: 401, statusMessage: 'Unknown passkey' })
  }
  const { origin, rpID } = getWebAuthnContext(event)
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
      counter: passkey.counter,
      transports: passkey.transports || [],
    },
    requireUserVerification: true,
  })
  if (!verification.verified) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Passkey verification failed',
    })
  }

  const user = db
    .select()
    .from(tables.users)
    .where(eq(tables.users.id, passkey.userId))
    .get()
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  db.update(tables.passkeys)
    .set({
      counter: verification.authenticationInfo.newCounter,
      backedUp: verification.authenticationInfo.credentialBackedUp,
      deviceType: verification.authenticationInfo.credentialDeviceType,
      lastUsedAt: new Date(),
    })
    .where(eq(tables.passkeys.id, passkey.id))
    .run()
  await establishUserSession(event, user)
  return { authenticated: true }
})
