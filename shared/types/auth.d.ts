import type { User as DBUser } from '../../server/utils/db'

declare module '#auth-utils' {
  interface User extends DBUser {}
  interface UserSession {
    sessionId?: string
  }
}

export {}
