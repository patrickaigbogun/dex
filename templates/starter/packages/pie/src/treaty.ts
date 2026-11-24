import type { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import type { Treaty } from '@elysiajs/eden'
import type { PieRetryOptions } from './types'
import { computeDelayMs, normalizeRetryOptions, shouldRetryAttempt, sleep } from './retry'

export type PieTreatyOptions = Omit<Treaty.Config, 'fetcher'> & {
	baseUrl?: string
	pieFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
	pieHeaders?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
	retry?: PieRetryOptions
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
			const method = (mergedInit.method ?? 'GET').toUpperCase()

			try {
				const res = await baseFetch(input, mergedInit)
				lastResponse = res

				const shouldRetry = shouldRetryAttempt(retry, { attempt, method, response: res, error: null })
				if (!shouldRetry) return res
			} catch (err) {
				lastError = err
				if (!shouldRetryAttempt(retry, { attempt, method, response: null, error: err })) throw err
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
