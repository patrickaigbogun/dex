import type { Api } from './type'
import { api } from './server'

/**
 * Server API instance.
 */
export { api }

/**
 * API type inferred from the server instance.
 */
export type { Api }

/**
 * Typed API client instance for browser usage.
 */
export { api as apiClient } from './client'
