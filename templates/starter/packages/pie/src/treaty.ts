import type { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import type { Treaty } from '@elysiajs/eden'
import type { PieRetryOptions } from './types'

export type PieTreatyOptions = Omit<Treaty.Config, 'fetcher'> & {
	baseUrl?: string
	pieFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
	pieHeaders?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
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

function defaultRetryOnStatuses() {
	return [408, 425, 429, 500, 502, 503, 504]
}

function normalizeRetryOptions(input?: PieRetryOptions): Required<PieRetryOptions> {
	const statuses = input?.retryOnStatuses ?? defaultRetryOnStatuses()
	return {
		retries: input?.retries ?? 2,
		minDelayMs: input?.minDelayMs ?? 150,
		maxDelayMs: input?.maxDelayMs ?? 1500,
		factor: input?.factor ?? 2,
		jitter: input?.jitter ?? 0.2,
		retryOnStatuses: statuses,
		retryOn:
			input?.retryOn ??
			(({ response, error }) => {
				if (error) return true
				if (response) return statuses.includes(response.status)
				return false
			}),
	}
}

async function mergeHeaders(
	base: HeadersInit | undefined,
	extra: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>) | undefined
): Promise<HeadersInit | undefined> {
	if (!extra) return base
	const resolved = typeof extra === 'function' ? await extra() : extra
	const h = new Headers(base)
	for (const [k, v] of Object.entries(resolved)) {
		if (v !== undefined && v !== null) h.set(k, v)
	}
	return h
}

/**
 * Creates a typed Eden Treaty client with resilient retries and dynamic headers for Elysia backends.
 */
export function treatyPie<App extends Elysia<any, any, any, any, any, any, any>>(
	baseUrlOrOpts: string | (PieTreatyOptions & { baseUrl: string }),
	maybeOpts?: PieTreatyOptions
): Treaty.Create<App> {
	const baseUrl = typeof baseUrlOrOpts === 'string' ? baseUrlOrOpts : baseUrlOrOpts.baseUrl
	const opts = (typeof baseUrlOrOpts === 'string' ? maybeOpts : baseUrlOrOpts) ?? {}

	const { pieHeaders, pieFetch, retry: retryInput, ...treatyConfig } = opts
	const retry = normalizeRetryOptions(retryInput)
	const baseFetch = pieFetch ?? (globalThis.fetch as unknown as (input: any, init?: any) => Promise<Response>)

	const fetcher = (async (input: any, init?: any) => {
		let lastError: unknown | null = null
		let lastResponse: Response | null = null

		for (let attempt = 1; attempt <= retry.retries + 1; attempt++) {
			lastError = null
			lastResponse = null

			const headers = await mergeHeaders(init?.headers, pieHeaders)
			const mergedInit: RequestInit = {
				...(init ?? {}),
				headers,
			}

			try {
				const res = await baseFetch(input, mergedInit)
				lastResponse = res

				const shouldRetry = retry.retryOn({ attempt, response: res, error: null })
				if (!shouldRetry) return res
			} catch (err) {
				lastError = err
				if (!retry.retryOn({ attempt, response: null, error: err })) throw err
			}

			if (attempt <= retry.retries) {
				await sleep(computeDelayMs(retry, attempt))
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
