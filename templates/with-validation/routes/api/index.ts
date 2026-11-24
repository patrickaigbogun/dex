import { Elysia } from 'elysia'
import { api as usersApi } from './users'

export const api = () => new Elysia().get('/v1/health', () => ({ ok: true })).use(usersApi)

export type Api = ReturnType<typeof api>
