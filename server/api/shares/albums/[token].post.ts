import { eq } from 'drizzle-orm'
import z from 'zod'
import {
  assertAlbumShareAvailable,
  getSharedAlbumPayload,
} from '~~/server/services/album-share'

export default eventHandler(async (event) => {
  const { token } = await getValidatedRouterParams(
    event,
    z.object({ token: z.string().min(16).max(64) }).parse,
  )
  const { password } = await readValidatedBody(
    event,
    z.object({ password: z.string().min(1).max(128) }).parse,
  )
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  const share = useDB()
    .select()
    .from(tables.albumShares)
    .where(eq(tables.albumShares.token, token))
    .get()
  assertAlbumShareAvailable(share)

  if (!share || !share.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password not required',
    })
  }

  if (!(await verifyPassword(share.passwordHash, password))) {
    throw createError({ statusCode: 401, statusMessage: 'Incorrect password' })
  }

  return getSharedAlbumPayload(event, share)
})
