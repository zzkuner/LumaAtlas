import {
  isSessionActive,
  touchAuthSession,
} from '~~/server/services/auth/session'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || !session.sessionId) return

  if (!isSessionActive(session.sessionId)) {
    await clearUserSession(event)
    return
  }

  touchAuthSession(session.sessionId)
})
