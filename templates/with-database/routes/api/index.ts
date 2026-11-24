import { Elysia } from 'elysia'
import { api as notesApi } from './notes'

export const api = () => new Elysia().get('/v1/health', () => ({ ok: true })).use(notesApi)

export type Api = ReturnType<typeof api>
