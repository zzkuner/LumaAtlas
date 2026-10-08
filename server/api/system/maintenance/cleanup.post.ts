import { and, eq, lt, or } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (!session.user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin required' })
  }

  const db = useDB()
  const now = new Date()
  const completedBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const failedBefore = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const expiredShares = db
    .delete(tables.albumShares)
    .where(
      and(
        eq(tables.albumShares.isActive, true),
        lt(tables.albumShares.expiresAt, now),
      ),
    )
    .run()
  const oldTasks = db
    .delete(tables.pipelineQueue)
    .where(
      or(
        and(
          eq(tables.pipelineQueue.status, 'completed'),
          lt(tables.pipelineQueue.completedAt, completedBefore),
        ),
        and(
          eq(tables.pipelineQueue.status, 'failed'),
          lt(tables.pipelineQueue.createdAt, failedBefore),
        ),
      ),
    )
    .run()

  return {
    expiredShares: expiredShares.changes,
    oldQueueTasks: oldTasks.changes,
    completedAt: now.toISOString(),
  }
})
