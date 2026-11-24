import type { PieRetryOptions } from './types'

export const DEFAULT_RETRY_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']

export type NormalizedRetryOptions = Required<PieRetryOptions> & {
	hasCustomRetryOn: boolean
}

export function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms))
}

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n))
}

export function computeDelayMs(opts: NormalizedRetryOptions, attempt: number) {
	const base = opts.minDelayMs * Math.pow(opts.factor, Math.max(0, attempt - 1))
	const capped = clamp(base, opts.minDelayMs, opts.maxDelayMs)
	const jitter = capped * opts.jitter * Math.random()
	return Math.round(capped + jitter)
}

function defaultRetryOnStatuses() {
	return [408, 425, 429, 500, 502, 503, 504]
}

export function normalizeRetryOptions(input?: PieRetryOptions): NormalizedRetryOptions {
	const statuses = input?.retryOnStatuses ?? defaultRetryOnStatuses()
	const methods = (input?.methods ?? DEFAULT_RETRY_METHODS).map((m) => m.toUpperCase())
	const hasCustomRetryOn = typeof input?.retryOn === 'function'

	return {
		retries: input?.retries ?? 2,
		minDelayMs: input?.minDelayMs ?? 150,
		maxDelayMs: input?.maxDelayMs ?? 1500,
		factor: input?.factor ?? 2,
		jitter: input?.jitter ?? 0.2,
		methods,
		retryOnStatuses: statuses,
		hasCustomRetryOn,
		retryOn:
			input?.retryOn ??
			(({ response, error }) => {
				if (error) return true
				if (response) return statuses.includes(response.status)
				return false
			}),
	}
}

export function shouldRetryAttempt(
	retry: NormalizedRetryOptions,
	ctx: { attempt: number; method: string; response: Response | null; error: unknown | null }
): boolean {
	if (!retry.hasCustomRetryOn && !retry.methods.includes(ctx.method)) {
		return false
	}
	return retry.retryOn(ctx)
}
