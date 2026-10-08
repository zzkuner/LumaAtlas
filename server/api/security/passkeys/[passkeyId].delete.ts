import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { passkeyId } = await getValidatedRouterParams(
    event,
    z.object({ passkeyId: z.coerce.number().int().positive() }).parse,
  )
  const result = useDB()
    .delete(tables.passkeys)
    .where(
      and(
        eq(tables.passkeys.id, passkeyId),
        eq(tables.passkeys.userId, session.user.id),
      ),
    )
    .run()
  if (!result.changes) {
    throw createError({ statusCode: 404, statusMessage: 'Passkey not found' })
  }
  return { deleted: true }
})
