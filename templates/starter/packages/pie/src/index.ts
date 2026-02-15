import type { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import type { Treaty } from '@elysiajs/eden'

/**
 * Retry configuration for API requests.
 */
export type PieRetryOptions = {
	retries?: number
	minDelayMs?: number
	maxDelayMs?: number
	factor?: number
	jitter?: number
	retryOnStatuses?: number[]
	retryOn?: (ctx: { attempt: number; response: Response | null; error: unknown | null }) => boolean
}

/**
 * Options for the Pie client wrapper.
 */
export type PieOptions = Omit<Treaty.Config, 'fetcher'> & {
	baseUrl?: string
	/** Optional custom fetch implementation (SSR/tests). */
	pieFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
	/** Optional static/dynamic headers merged into every request. */
	pieHeaders?: Record<string, string> | (() => Record<string, string>)
	retry?: PieRetryOptions
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms))
}

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n))
}

function computeDelayMs(opts: Required<PieRetryOptions>, attempt: number) {
	const base = opts.minDelayMs * Math.pow(opts.factor, Math.max(0, attempt - 1))
	const capped = clamp(base, opts.minDelayMs, opts.maxDelayMs)
	const jitter = capped * opts.jitter * Math.random()
	return Math.round(capped + jitter)
}

function mergeHeaders(
	base: HeadersInit | undefined,
	extra: Record<string, string> | undefined,
): HeadersInit | undefined {
	if (!extra || Object.keys(extra).length === 0) return base
	const h = new Headers(base)
	for (const [k, v] of Object.entries(extra)) h.set(k, v)
	return h
}

function defaultRetryOnStatuses() {
	return [408, 425, 429, 500, 502, 503, 504]
}

function normalizeRetryOptions(input?: PieRetryOptions): Required<PieRetryOptions> {
	return {
		retries: input?.retries ?? 2,
		minDelayMs: input?.minDelayMs ?? 150,
		maxDelayMs: input?.maxDelayMs ?? 1500,
		factor: input?.factor ?? 2,
		jitter: input?.jitter ?? 0.2,
		retryOnStatuses: input?.retryOnStatuses ?? defaultRetryOnStatuses(),
		retryOn:
			input?.retryOn ??
			(({ response, error }) => {
				if (error) return true
				if (!response) return true
				return false
			}),
	}
}

function isRetryableResponse(opts: Required<PieRetryOptions>, res: Response) {
	return opts.retryOnStatuses.includes(res.status)
}

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
export default function pie<App extends Elysia<any, any, any, any, any, any, any>>(
	baseUrlOrOpts: string | (PieOptions & { baseUrl: string }),
	maybeOpts?: PieOptions,
): Treaty.Create<App> {
	const baseUrl = typeof baseUrlOrOpts === 'string' ? baseUrlOrOpts : baseUrlOrOpts.baseUrl
	const opts = (typeof baseUrlOrOpts === 'string' ? maybeOpts : baseUrlOrOpts) ?? {}

	const { pieHeaders, pieFetch, retry: retryInput, ...treatyConfig } = opts
	const retry = normalizeRetryOptions(retryInput)
	const baseFetch = pieFetch ?? (globalThis.fetch as unknown as (input: any, init?: any) => Promise<Response>)
	const resolveExtraHeaders =
		typeof pieHeaders === 'function' ? pieHeaders : () => (pieHeaders ?? {})

	const fetcher = (async (input: any, init?: any) => {
		let lastError: unknown | null = null
		let lastResponse: Response | null = null

		for (let attempt = 1; attempt <= retry.retries + 1; attempt++) {
			lastError = null
			lastResponse = null

			const mergedInit: RequestInit = {
				...(init ?? {}),
				headers: mergeHeaders(init?.headers, resolveExtraHeaders()),
			}

			try {
				const res = await baseFetch(input, mergedInit)
				lastResponse = res

				const shouldRetry = isRetryableResponse(retry, res)
				if (!shouldRetry) return res
				if (!retry.retryOn({ attempt, response: res, error: null })) return res
			} catch (err) {
				lastError = err
				if (!retry.retryOn({ attempt, response: null, error: err })) throw err
			}

			if (attempt <= retry.retries) {
				await sleep(computeDelayMs(retry, attempt))
				continue
			}
		}

		if (lastError) throw lastError
		return lastResponse as Response
	}) as unknown as NonNullable<Treaty.Config['fetcher']>

	return treaty<App>(baseUrl, {
		...(treatyConfig as Treaty.Config),
		fetcher,
	}) as any
}
