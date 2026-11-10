import { z } from 'zod'
import { desc, sql, eq, and } from 'drizzle-orm'

/**
 * 获取所有队列任务记录列表
 */
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  try {
    const query = getQuery(event)
    const { status, type, page, limit } = await z
      .object({
        status: z
          .enum(['pending', 'in-stages', 'completed', 'failed'])
          .optional(),
        type: z
          .enum([
            'photo',
            'live-photo-video',
            'photo-reverse-geocoding',
            'photo-erase-location',
          ])
          .optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(30),
      })
      .parseAsync(query)

    const db = useDB()

    // 构建查询条件
    const conditions = []

    if (status) {
      conditions.push(eq(tables.pipelineQueue.status, status))
    }

    if (type) {
      conditions.push(
        eq(sql`json_extract(${tables.pipelineQueue.payload}, '$.type')`, type),
      )
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined

    // 构建查询
    const tasks = db
      .select({
        id: tables.pipelineQueue.id,
        payload: tables.pipelineQueue.payload,
        priority: tables.pipelineQueue.priority,
        attempts: tables.pipelineQueue.attempts,
        maxAttempts: tables.pipelineQueue.maxAttempts,
        status: tables.pipelineQueue.status,
        statusStage: tables.pipelineQueue.statusStage,
        errorMessage: tables.pipelineQueue.errorMessage,
        createdAt: tables.pipelineQueue.createdAt,
        completedAt: tables.pipelineQueue.completedAt,
      })
      .from(tables.pipelineQueue)
      .where(whereCondition)
      .orderBy(desc(tables.pipelineQueue.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)
      .all()
    const total =
      db
        .select({ value: sql<number>`count(*)` })
        .from(tables.pipelineQueue)
        .where(whereCondition)
        .get()?.value ?? 0
    const statusCounts = db
      .select({
        status: tables.pipelineQueue.status,
        value: sql<number>`count(*)`,
      })
      .from(tables.pipelineQueue)
      .groupBy(tables.pipelineQueue.status)
      .all()
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 }
    for (const row of statusCounts) {
      if (row.status === 'pending') stats.pending = row.value
      if (row.status === 'in-stages') stats.processing = row.value
      if (row.status === 'completed') stats.completed = row.value
      if (row.status === 'failed') stats.failed = row.value
    }

    return {
      success: true,
      data: tasks,
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
      stats,
    }
  } catch (error) {
    console.error('Failed to fetch task list:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch task list',
    })
  }
})
