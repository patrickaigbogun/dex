import { Elysia } from 'elysia'
import { api as tasksApi } from './tasks'

export const api = () => new Elysia().get('/v1/health', () => ({ ok: true })).use(tasksApi)

export type Api = ReturnType<typeof api>
