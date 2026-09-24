import type { PieClient, PieOptions } from './types';
/**
 * Create a typed, framework-agnostic Pie API client.
 *
 * @example
 * ```ts
 * import { createPie } from '@dex/pie'
 * import type { ConcordApi } from './core/api/generated'
 *
 * export const api = createPie<ConcordApi>({
 *   baseUrl: 'http://localhost:4000',
 *   headers: () => ({ Authorization: `Bearer ${getToken()}` }),
 *   retry: { retries: 3 }
 * })
 *
 * const { data, error } = await api.v1.guilds('123').channels('456').messages.get({
 *   query: { limit: 50 }
 * })
 * ```
 */
export declare function createPie<Schema = any>(baseUrlOrOpts?: string | PieOptions, maybeOpts?: PieOptions): PieClient<Schema>;
