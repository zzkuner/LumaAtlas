import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { establishUserSession } from '~~/server/services/auth/session'
import {
  decryptTotpSecret,
  hashRecoveryCode,
  verifyTotp,
} from '~~/server/services/auth/totp'

const _invalidCredentialsError = createError({
  statusCode: 401,
  message: 'Invalid credentials',
})

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 8
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000

export default eventHandler(async (event) => {
  const db = useDB()
  const { email, password, twoFactorCode } = await readValidatedBody(
    event,
    z.object({
      email: z.email(),
      password: z.string().min(6),
      twoFactorCode: z.string().trim().min(6).max(24).optional(),
    }).parse,
  )
  const attemptKey = `${getRequestIP(event, { xForwardedFor: true }) || 'unknown'}:${email.toLowerCase()}`
  const attempt = attempts.get(attemptKey)
  if (
    attempt &&
    attempt.resetAt > Date.now() &&
    attempt.count >= MAX_ATTEMPTS
  ) {
    setResponseHeader(
      event,
      'Retry-After',
      Math.ceil((attempt.resetAt - Date.now()) / 1000),
    )
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many login attempts',
    })
  }

  const recordFailure = () => {
    const current = attempts.get(attemptKey)
    attempts.set(attemptKey, {
      count: current && current.resetAt > Date.now() ? current.count + 1 : 1,
      resetAt:
        current && current.resetAt > Date.now()
          ? current.resetAt
          : Date.now() + ATTEMPT_WINDOW_MS,
    })
  }

  const user = db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, email))
    .get()

  if (!user) {
    recordFailure()
    throw _invalidCredentialsError
  }

  if (!(await verifyPassword(user.password || '', password))) {
    recordFailure()
    throw _invalidCredentialsError
  }

  const factor = db
    .select()
    .from(tables.authFactors)
    .where(
      and(
        eq(tables.authFactors.userId, user.id),
        eq(tables.authFactors.type, 'totp'),
        eq(tables.authFactors.enabled, true),
      ),
    )
    .get()
  if (factor) {
    if (!twoFactorCode) {
      setResponseStatus(event, 202)
      return { requiresTwoFactor: true }
    }

    const validTotp = verifyTotp(
      decryptTotpSecret(factor.secret),
      twoFactorCode,
    )
    const recoveryCode = validTotp
      ? null
      : db
          .select()
          .from(tables.authRecoveryCodes)
          .where(
            and(
              eq(tables.authRecoveryCodes.userId, user.id),
              eq(
                tables.authRecoveryCodes.codeHash,
                hashRecoveryCode(twoFactorCode),
              ),
              isNull(tables.authRecoveryCodes.usedAt),
            ),
          )
          .get()
    if (!validTotp && !recoveryCode) {
      recordFailure()
      throw _invalidCredentialsError
    }
    if (recoveryCode) {
      db.update(tables.authRecoveryCodes)
        .set({ usedAt: new Date() })
        .where(eq(tables.authRecoveryCodes.id, recoveryCode.id))
        .run()
    }
  }

  attempts.delete(attemptKey)
  await establishUserSession(event, user)
  setResponseStatus(event, 201)
  return { authenticated: true }
})
