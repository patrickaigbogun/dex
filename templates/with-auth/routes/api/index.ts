import { Elysia } from 'elysia'
import { api as authRoutes } from './auth'

export const api = () => new Elysia().get('/v1/health', () => ({ ok: true })).use(authRoutes)

export type Api = ReturnType<typeof api>
