import { generateAuthenticationOptions } from '@simplewebauthn/server'
import {
  getWebAuthnContext,
  storeWebAuthnChallenge,
} from '~~/server/services/auth/webauthn'

export default eventHandler(async (event) => {
  const { rpID } = getWebAuthnContext(event)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
  })
  return {
    options,
    challengeId: storeWebAuthnChallenge('authentication', options.challenge),
  }
})
