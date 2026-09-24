import type {
	PieClient,
	PieMethod,
	PieOptions,
	PieRequestOptions,
	PieResponse,
	PieRetryOptions,
} from './types'

const HTTP_VERBS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options'])

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

async function resolveHeaders(
	globalHeaders: PieOptions['headers'],
	callHeaders?: Record<string, string>
): Promise<Headers> {
	const headers = new Headers()

	if (globalHeaders) {
		const resolved = typeof globalHeaders === 'function' ? await globalHeaders() : globalHeaders
		for (const [k, v] of Object.entries(resolved)) {
			if (v !== undefined && v !== null) headers.set(k, v)
		}
	}

	if (callHeaders) {
		for (const [k, v] of Object.entries(callHeaders)) {
			if (v !== undefined && v !== null) headers.set(k, v)
		}
	}

	return headers
}

function getDefaultBaseUrl(): string {
	if (typeof process !== 'undefined' && process.env) {
		return (
			process.env.PUBLIC_API_URL ||
			process.env.NEXT_PUBLIC_API_URL ||
			process.env.VITE_API_URL ||
			''
		)
	}
	return ''
}

function formatQueryString(query?: Record<string, any>): string {
	if (!query) return ''
	const searchParams = new URLSearchParams()

	for (const [key, val] of Object.entries(query)) {
		if (val === undefined || val === null) continue
		if (Array.isArray(val)) {
			for (const item of val) {
				if (item !== undefined && item !== null) searchParams.append(key, String(item))
			}
		} else {
			searchParams.append(key, String(val))
		}
	}

	const qs = searchParams.toString()
	return qs ? `?${qs}` : ''
}

async function executeRequest<TData, TError>(
	method: string,
	segments: string[],
	options: PieRequestOptions | undefined,
	clientOptions: PieOptions
): Promise<PieResponse<TData, TError>> {
	const base = (options?.baseUrl ?? clientOptions.baseUrl ?? getDefaultBaseUrl()).replace(/\/+$/, '')
	const prefix = (clientOptions.prefix ?? '').replace(/^\/+|\/+$/g, '')

	const normalizedSegments = segments.filter(Boolean).map((s) => encodeURIComponent(String(s).trim()))
	const allParts = [prefix, ...normalizedSegments].filter(Boolean)
	const path = '/' + allParts.join('/')
	const qs = formatQueryString(options?.query)
	const fullUrl = `${base}${path}${qs}`

	const headers = await resolveHeaders(clientOptions.headers, options?.headers)

	let body: BodyInit | undefined = undefined
	if (options?.body !== undefined) {
		const rawBody = options.body
		if (
			typeof rawBody === 'string' ||
			rawBody instanceof FormData ||
			rawBody instanceof Blob ||
			rawBody instanceof URLSearchParams ||
			rawBody instanceof ArrayBuffer
		) {
			body = rawBody
		} else {
			body = JSON.stringify(rawBody)
			if (!headers.has('content-type')) {
				headers.set('content-type', 'application/json')
			}
		}
	}

	const fetchFn = clientOptions.fetch ?? globalThis.fetch
	const retry = normalizeRetryOptions(clientOptions.retry)

	let lastResponse: Response | null = null
	let lastError: unknown | null = null

	for (let attempt = 1; attempt <= retry.retries + 1; attempt++) {
		lastError = null
		lastResponse = null

		const init: RequestInit = {
			method: method.toUpperCase(),
			headers,
			body,
			signal: options?.signal,
		}

		if (clientOptions.onRequest) {
			await clientOptions.onRequest({ url: fullUrl, init })
		}

		try {
			const res = await fetchFn(fullUrl, init)
			lastResponse = res

			if (clientOptions.onResponse) {
				await clientOptions.onResponse({ response: res, url: fullUrl })
			}

			const shouldRetry = retry.retryOn({ attempt, response: res, error: null })
			if (!shouldRetry || attempt > retry.retries) {
				break
			}
		} catch (err) {
			lastError = err
			if (clientOptions.onError) {
				await clientOptions.onError({ error: err, url: fullUrl })
			}

			const shouldRetry = retry.retryOn({ attempt, response: null, error: err })
			if (!shouldRetry || attempt > retry.retries) {
				break
			}
		}

		if (attempt <= retry.retries) {
			await sleep(computeDelayMs(retry, attempt))
		}
	}

	if (lastError && !lastResponse) {
		return {
			data: null,
			error: lastError as TError,
			status: 0,
			ok: false,
			headers: new Headers(),
			response: null as any,
		}
	}

	const res = lastResponse!
	const contentType = res.headers.get('content-type') ?? ''
	let parsedBody: any = null

	if (res.status !== 204 && res.status !== 205 && res.body) {
		try {
			if (contentType.includes('application/json') || contentType.includes('+json')) {
				parsedBody = await res.json()
			} else if (contentType.includes('text/')) {
				parsedBody = await res.text()
			} else {
				parsedBody = await res.blob()
			}
		} catch (err) {
			parsedBody = null
		}
	}

	if (res.ok) {
		return {
			data: parsedBody as TData,
			error: null,
			status: res.status,
			ok: true,
			headers: res.headers,
			response: res,
		}
	}

	return {
		data: null,
		error: parsedBody as TError,
		status: res.status,
		ok: false,
		headers: res.headers,
		response: res,
	}
}

/**
 * Creates a recursive proxy that builds the typed route tree.
 */
function createRouteProxy(segments: string[], clientOptions: PieOptions): any {
	const proxyTarget = (...args: any[]) => {
		// Calling segment as function: e.g. api.guilds('123') or api.guilds({ id: '123' })
		const newSegments = [...segments]
		for (const arg of args) {
			if (arg !== undefined && arg !== null) {
				if (typeof arg === 'object' && !Array.isArray(arg)) {
					const vals = Object.values(arg)
					if (vals.length === 1) {
						newSegments.push(String(vals[0]))
					} else {
						newSegments.push(String(arg))
					}
				} else {
					newSegments.push(String(arg))
				}
			}
		}
		return createRouteProxy(newSegments, clientOptions)
	}

	return new Proxy(proxyTarget, {
		get(_target, prop: string | symbol) {
			if (typeof prop === 'symbol' || prop === 'then' || prop === 'catch' || prop === 'finally') {
				return undefined
			}

			const propStr = String(prop)

			// If prop is an HTTP verb, return the callable method
			if (HTTP_VERBS.has(propStr.toLowerCase())) {
				const verb = propStr.toLowerCase()
				return (requestOptions?: PieRequestOptions) => {
					return executeRequest(verb, segments, requestOptions, clientOptions)
				}
			}

			// Otherwise, append property name as a static segment in the path tree
			return createRouteProxy([...segments, propStr], clientOptions)
		},
	})
}

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
export function createPie<Schema = any>(
	baseUrlOrOpts?: string | PieOptions,
	maybeOpts?: PieOptions
): PieClient<Schema> {
	const opts: PieOptions =
		typeof baseUrlOrOpts === 'string'
			? { ...(maybeOpts ?? {}), baseUrl: baseUrlOrOpts }
			: (baseUrlOrOpts ?? {})

	return createRouteProxy([], opts) as PieClient<Schema>
}
