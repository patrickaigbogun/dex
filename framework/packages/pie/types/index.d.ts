import type { Elysia } from 'elysia';
import type { Treaty } from '@elysiajs/eden';
/**
 * Retry configuration for API requests.
 */
export type PieRetryOptions = {
    retries?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    jitter?: number;
    retryOnStatuses?: number[];
    retryOn?: (ctx: {
        attempt: number;
        response: Response | null;
        error: unknown | null;
    }) => boolean;
};
/**
 * Options for the Pie client wrapper.
 */
export type PieOptions = Omit<Treaty.Config, 'fetcher'> & {
    baseUrl?: string;
    /** Optional custom fetch implementation (SSR/tests). */
    pieFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    /** Optional static/dynamic headers merged into every request. */
    pieHeaders?: Record<string, string> | (() => Record<string, string>);
    retry?: PieRetryOptions;
};
/**
 * Create a typed Eden treaty client with retries and header helpers.
 *
 * @example
 * ```ts
 * import pie from '@dex/pie'
 * import type { Api } from '@core/api'
 *
 * const client = pie<Api>('http://localhost:7990/api', {
 *   retry: { retries: 2 },
 *   pieHeaders: () => ({ Authorization: `Bearer ${token}` }),
 * })
 *
 * const res = await client.health.get()
 * ```
 */
export default function pie<App extends Elysia<any, any, any, any, any, any, any>>(baseUrlOrOpts: string | (PieOptions & {
    baseUrl: string;
}), maybeOpts?: PieOptions): Treaty.Create<App>;
