import { z } from 'zod'

export default eventHandler(async (event) => {
  await requireWizardAccess(event, { allowAnonymousWithoutUser: true })

  const db = useDB()
  const { email, password, username } = await readValidatedBody(
    event,
    z.object({
      email: z.email(),
      password: z.string().min(6),
      username: z.string().min(2).default('admin'),
    }).parse,
  )

  // Check if any user exists
  const existingUser = db.select().from(tables.users).limit(1).get()
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'An administrator already exists',
    })
  }

  await db
    .insert(tables.users)
    .values({
      email,
      username,
      password: await hashPassword(password),
      isAdmin: 1,
      createdAt: new Date(),
    })
    .run()

  return { success: true }
})
