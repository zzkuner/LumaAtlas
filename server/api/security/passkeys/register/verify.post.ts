import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { getWebAuthnContext } from '~~/server/services/auth/webauthn'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readValidatedBody(
    event,
    z.object({
      challengeId: z.string().min(20),
      name: z.string().trim().min(1).max(80).default('Passkey'),
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
        eq(tables.webauthnChallenges.userId, session.user.id),
        eq(tables.webauthnChallenges.type, 'registration'),
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

  const { origin, rpID } = getWebAuthnContext(event)
  const verification = await verifyRegistrationResponse({
    response: body.response as unknown as RegistrationResponseJSON,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })
  if (!verification.verified) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Passkey verification failed',
    })
  }

  const info = verification.registrationInfo
  db.insert(tables.passkeys)
    .values({
      userId: session.user.id,
      credentialId: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
      counter: info.credential.counter,
      transports: info.credential.transports || [],
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      name: body.name,
    })
    .run()

  return { registered: true }
})
