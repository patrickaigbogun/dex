import { Elysia } from 'elysia'
import { apiRoutes } from '../../routes/api'

/**
 * API app used for server routes and client typing.
 */
export const api = new Elysia().use(apiRoutes())

/**
 * API type consumed by the typed client.
 */
export type Api = typeof api;
// const health = api['~Routes'].health.get.response[200]

/**
 * Typed API client instance for browser usage.
 */
export { api as apiClient } from './client'