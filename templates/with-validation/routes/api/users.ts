import { Elysia } from 'elysia'
import { v, validateParams, validateQuery, validateBody } from '@dex/validation'

interface User {
  id: number
  name: string
  email: string
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

const listQuerySchema = v.object({
  page: v.coerce.number({ min: 1, int: true }).default(1),
  limit: v.coerce.number({ min: 1, max: 100, int: true }).default(10),
})

const userParamSchema = v.object({
  id: v.coerce.number({ min: 1, int: true }),
})

const createUserBodySchema = v.object({
  name: v.string({ min: 2, max: 80 }),
  email: v.string({ min: 5, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }),
})

export const api = new Elysia()
  .get('/users', ({ query }) => {
    const validated = validateQuery(listQuerySchema, query)
    const { page, limit } = validated
    const start = (page - 1) * limit
    return users.slice(start, start + limit)
  })
  .get('/users/:id', ({ params, set }) => {
    const validated = validateParams(userParamSchema, params)
    const user = users.find((u) => u.id === validated.id)
    if (!user) {
      set.status = 404
      return { error: 'Not found' }
    }
    return user
  })
  .post('/users', ({ body }) => {
    const validated = validateBody(createUserBodySchema, body)
    const newUser: User = {
      id: users.length + 1,
      name: validated.name,
      email: validated.email,
    }
    users.push(newUser)
    return newUser
  })

export type Api = typeof api
