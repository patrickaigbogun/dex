import { useParams, useQuery } from '@dex/router/client'
import {
	normalizeQueryInput,
	safeValidate,
	validate,
	type Infer,
	type Schema,
	type ValidationResult,
} from './index'

export type UseValidatedOptions = {
	strict?: boolean
}

/**
 * Validate current route params from `@dex/router/client` against `schema`.
 */
export function useValidatedParams<S extends Schema<any>>(
	schema: S,
	options: { strict: true }
): Infer<S>
export function useValidatedParams<S extends Schema<any>>(
	schema: S,
	options?: { strict?: false }
): ValidationResult<Infer<S>>
export function useValidatedParams<S extends Schema<any>>(
	schema: S,
	options?: UseValidatedOptions
): Infer<S> | ValidationResult<Infer<S>> {
	const params = useParams()
	if (options?.strict) {
		return validate(schema, params)
	}
	return safeValidate(schema, params)
}

/**
 * Validate current URL query params from `@dex/router/client` against `schema`.
 */
export function useValidatedQuery<S extends Schema<any>>(
	schema: S,
	options: { strict: true }
): Infer<S>
export function useValidatedQuery<S extends Schema<any>>(
	schema: S,
	options?: { strict?: false }
): ValidationResult<Infer<S>>
export function useValidatedQuery<S extends Schema<any>>(
	schema: S,
	options?: UseValidatedOptions
): Infer<S> | ValidationResult<Infer<S>> {
	const query = useQuery()
	const normalized = normalizeQueryInput(query)
	if (options?.strict) {
		return validate(schema, normalized)
	}
	return safeValidate(schema, normalized)
}
