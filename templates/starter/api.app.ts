import { Elysia } from 'elysia'
import { apiRoutes } from './routes/api'

export const api = new Elysia().use(apiRoutes())

export type Api = typeof api;