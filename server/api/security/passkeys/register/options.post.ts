import { generateRegistrationOptions } from '@simplewebauthn/server'
import { eq } from 'drizzle-orm'
import {
  getWebAuthnContext,
  storeWebAuthnChallenge,
} from '~~/server/services/auth/webauthn'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { rpID } = getWebAuthnContext(event)
  const existing = useDB()
    .select({
      id: tables.passkeys.credentialId,
      transports: tables.passkeys.transports,
    })
    .from(tables.passkeys)
    .where(eq(tables.passkeys.userId, session.user.id))
    .all()
  const rpName = String(
    (useRuntimeConfig(event) as any).public?.app?.title || 'LumaAtlas',
  )
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(String(session.user.id)),
    userName: session.user.email,
    userDisplayName: session.user.username,
    attestationType: 'none',
    excludeCredentials: existing.map((credential) => ({
      id: credential.id,
      transports: credential.transports || [],
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  })

  return {
    options,
    challengeId: storeWebAuthnChallenge(
      'registration',
      options.challenge,
      session.user.id,
    ),
  }
})
