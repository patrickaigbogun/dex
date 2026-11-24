import { Elysia } from 'elysia'

export const testRoutes = new Elysia().get('/test', () => ({ ok: true as const }))
