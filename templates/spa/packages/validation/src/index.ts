import type { Elysia } from 'elysia'

/**
 * Single field or value validation issue.
 */
export type ValidationIssue = {
	path: (string | number)[]
	message: string
}

/**
 * Result returned by `safeValidate`.
 */
export type ValidationResult<T> =
	| { ok: true; data: T }
	| { ok: false; issues: ValidationIssue[] }

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const hasOwn: (obj: object, key: PropertyKey) => boolean =
	(Object as { hasOwn?: (obj: object, key: PropertyKey) => boolean }).hasOwn ??
	((obj, key) => Object.prototype.hasOwnProperty.call(obj, key))

function formatValidationMessage(issues: ValidationIssue[]): string {
	if (issues.length === 0) return 'Validation failed'
	const details = issues
		.map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
		.join('; ')
	return `Validation failed: ${details}`
}

/**
 * Error thrown by `validate`, `validateParams`, `validateQuery`, and `validateBody` on failure.
 */
export class ValidationError extends Error {
	readonly status = 422
	readonly issues: ValidationIssue[]

	constructor(issues: ValidationIssue[], message?: string) {
		super(message ?? formatValidationMessage(issues))
		this.name = 'ValidationError'
		this.issues = issues
	}
}

/**
 * Standard Schema v1 interface (https://standardschema.dev).
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': {
		readonly version: 1
		readonly vendor: string
		readonly validate: (
			value: unknown
		) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>
		readonly types?: {
			readonly input: Input
			readonly output: Output
		}
	}
}

export type StandardSchemaV1Result<Output> =
	| { readonly value: Output; readonly issues?: undefined }
	| { readonly issues: ReadonlyArray<StandardSchemaV1Issue> }

export interface StandardSchemaV1Issue {
	readonly message: string
	readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
}

/**
 * Zod-compatible schema shape (`safeParse` / `parse`).
 */
export interface ZodLikeSchema<Output = unknown> {
	safeParse: (
		input: unknown
	) =>
		| { success: true; data: Output }
		| {
				success: false
				error: {
					message?: string
					issues?: ReadonlyArray<{ path?: ReadonlyArray<PropertyKey>; message: string }>
					errors?: ReadonlyArray<{ path?: ReadonlyArray<PropertyKey>; message: string }>
				}
		  }
	parse?: (input: unknown) => Output
}

/**
 * Built-in `@dex/validation` schema with Standard Schema v1 and Zod-like compatibility.
 */
export interface DexSchema<TOutput> extends StandardSchemaV1<unknown, TOutput>, ZodLikeSchema<TOutput> {
	parse: (input: unknown) => TOutput
	optional: () => DexSchema<TOutput | undefined>
	default: (value: Exclude<TOutput, undefined>) => DexSchema<Exclude<TOutput, undefined>>
}

/**
 * Supported schema types: built-in `v.*`, Standard Schema v1 (Valibot, ArkType, Zod v4), or Zod-like.
 */
export type Schema<TOutput = unknown> =
	| DexSchema<TOutput>
	| StandardSchemaV1<unknown, TOutput>
	| ZodLikeSchema<TOutput>
	| { parse: (input: unknown) => TOutput }

/**
 * Infer the output TypeScript type of any supported schema.
 */
export type Infer<S> =
	S extends DexSchema<infer O>
		? O
		: S extends StandardSchemaV1<any, infer O>
			? O
			: S extends {
					safeParse: (input: unknown) => { success: true; data: infer O } | { success: false; error: any }
				}
				? O
				: S extends { parse: (input: unknown) => infer O }
					? O
					: never

function normalizePath(rawPath?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>): (string | number)[] {
	if (!rawPath || rawPath.length === 0) return []
	return rawPath.map((seg) => {
		const raw = typeof seg === 'object' && seg !== null && 'key' in seg ? seg.key : seg
		if (typeof raw === 'number' || typeof raw === 'string') return raw
		return String(raw)
	})
}

function normalizeStandardResult<T>(res: StandardSchemaV1Result<T>): ValidationResult<T> {
	if (!res.issues) {
		return { ok: true, data: res.value }
	}
	return {
		ok: false,
		issues: res.issues.map((issue) => ({
			path: normalizePath(issue.path),
			message: issue.message,
		})),
	}
}

function isPromiseLike(val: unknown): val is PromiseLike<unknown> {
	return (typeof val === 'object' || typeof val === 'function') && val !== null && 'then' in val && typeof (val as any).then === 'function'
}

function normalizeZodError(err: unknown): ValidationIssue[] {
	if (err && typeof err === 'object') {
		const rawIssues = (err as any).issues ?? (err as any).errors
		if (Array.isArray(rawIssues) && rawIssues.length > 0) {
			return rawIssues.map((issue: any) => ({
				path: normalizePath(issue?.path),
				message: typeof issue?.message === 'string' ? issue.message : 'Validation failed',
			}))
		}
		if (typeof (err as any).message === 'string' && (err as any).message.length > 0) {
			return [{ path: [], message: (err as any).message }]
		}
	}
	return [{ path: [], message: 'Validation failed' }]
}

/**
 * Validate `input` against `schema` without throwing.
 */
export function safeValidate<S extends Schema<any>>(schema: S, input: unknown): ValidationResult<Infer<S>> {
	if (!schema || typeof schema !== 'object') {
		throw new TypeError('Invalid schema passed to safeValidate')
	}

	if ('~standard' in schema && schema['~standard']?.version === 1) {
		const res = schema['~standard'].validate(input)
		if (isPromiseLike(res)) {
			throw new Error('Async schema validation is not supported in synchronous safeValidate()')
		}
		return normalizeStandardResult(res) as ValidationResult<Infer<S>>
	}

	if ('safeParse' in schema && typeof schema.safeParse === 'function') {
		const res = schema.safeParse(input)
		if (res.success) {
			return { ok: true, data: res.data }
		}
		return { ok: false, issues: normalizeZodError(res.error) }
	}

	if ('parse' in schema && typeof schema.parse === 'function') {
		try {
			return { ok: true, data: schema.parse(input) }
		} catch (err) {
			return { ok: false, issues: normalizeZodError(err) }
		}
	}

	throw new TypeError('Unsupported schema: expected Standard Schema v1, Zod-like safeParse/parse, or v.* schema')
}

async function safeValidateAsync<S extends Schema<any>>(
	schema: S,
	input: unknown
): Promise<ValidationResult<Infer<S>>> {
	if (!schema || typeof schema !== 'object') {
		throw new TypeError('Invalid schema passed to validate')
	}

	if ('~standard' in schema && schema['~standard']?.version === 1) {
		const res = await schema['~standard'].validate(input)
		return normalizeStandardResult(res) as ValidationResult<Infer<S>>
	}

	return safeValidate(schema, input)
}

/**
 * Validate `input` against `schema`, throwing `ValidationError` (status 422) on failure.
 */
export function validate<S extends Schema<any>>(schema: S, input: unknown): Infer<S> {
	const res = safeValidate(schema, input)
	if (!res.ok) {
		throw new ValidationError(res.issues)
	}
	return res.data
}

function createSchema<TOutput>(
	run: (input: unknown) => ValidationResult<TOutput>
): DexSchema<TOutput> {
	const schema: DexSchema<TOutput> = {
		'~standard': {
			version: 1,
			vendor: '@dex/validation',
			validate(value: unknown): StandardSchemaV1Result<TOutput> {
				const res = run(value)
				if (res.ok) {
					return { value: res.data }
				}
				return { issues: res.issues }
			},
		},
		safeParse(input: unknown) {
			const res = run(input)
			if (res.ok) {
				return { success: true as const, data: res.data }
			}
			return { success: false as const, error: { issues: res.issues } }
		},
		parse(input: unknown): TOutput {
			const res = run(input)
			if (!res.ok) {
				throw new ValidationError(res.issues)
			}
			return res.data
		},
		optional(): DexSchema<TOutput | undefined> {
			return createSchema<TOutput | undefined>((input) => {
				if (input === undefined) {
					return { ok: true, data: undefined }
				}
				return run(input)
			})
		},
		default(defaultValue: Exclude<TOutput, undefined>): DexSchema<Exclude<TOutput, undefined>> {
			return createSchema<Exclude<TOutput, undefined>>((input) => {
				if (input === undefined) {
					return { ok: true, data: defaultValue }
				}
				return run(input) as ValidationResult<Exclude<TOutput, undefined>>
			})
		},
	}

	return schema
}

type Prettify<T> = { [K in keyof T]: T[K] } & {}

type InferShape<Shape extends Record<string, Schema<any>>> = {
	[K in keyof Shape]: Infer<Shape[K]>
}

type OptionalShapeKeys<T extends Record<string, unknown>> = {
	[K in keyof T]-?: undefined extends T[K] ? K : never
}[keyof T]

type RequiredShapeKeys<T extends Record<string, unknown>> = Exclude<keyof T, OptionalShapeKeys<T>>

export type ObjectOutput<Shape extends Record<string, Schema<any>>> = Prettify<
	{ [K in RequiredShapeKeys<InferShape<Shape>>]: InferShape<Shape>[K] } & {
		[K in OptionalShapeKeys<InferShape<Shape>>]?: InferShape<Shape>[K]
	}
>

export type StringOptions = {
	min?: number
	max?: number
	pattern?: RegExp
}

export type NumberOptions = {
	min?: number
	max?: number
	int?: boolean
}

function validateNumberValue(val: number, opts?: NumberOptions): ValidationResult<number> {
	if (!Number.isFinite(val)) {
		return { ok: false, issues: [{ path: [], message: 'Expected finite number' }] }
	}
	if (opts?.int && !Number.isInteger(val)) {
		return { ok: false, issues: [{ path: [], message: 'Expected integer' }] }
	}
	if (opts?.min !== undefined && val < opts.min) {
		return { ok: false, issues: [{ path: [], message: `Number must be at least ${opts.min}` }] }
	}
	if (opts?.max !== undefined && val > opts.max) {
		return { ok: false, issues: [{ path: [], message: `Number must be at most ${opts.max}` }] }
	}
	return { ok: true, data: val }
}

/**
 * Lightweight built-in schema builder compatible with Standard Schema v1.
 */
export const v = {
	string(opts?: StringOptions): DexSchema<string> {
		const pattern = opts?.pattern
			? new RegExp(opts.pattern.source, opts.pattern.flags.replace(/[gy]/g, ''))
			: undefined
		return createSchema<string>((input) => {
			if (typeof input !== 'string') {
				return { ok: false, issues: [{ path: [], message: 'Expected string' }] }
			}
			if (opts?.min !== undefined && input.length < opts.min) {
				return {
					ok: false,
					issues: [{ path: [], message: `String must be at least ${opts.min} characters` }],
				}
			}
			if (opts?.max !== undefined && input.length > opts.max) {
				return {
					ok: false,
					issues: [{ path: [], message: `String must be at most ${opts.max} characters` }],
				}
			}
			if (pattern && !pattern.test(input)) {
				return { ok: false, issues: [{ path: [], message: 'String does not match required pattern' }] }
			}
			return { ok: true, data: input }
		})
	},

	number(opts?: NumberOptions): DexSchema<number> {
		return createSchema<number>((input) => {
			if (typeof input !== 'number' || Number.isNaN(input)) {
				return { ok: false, issues: [{ path: [], message: 'Expected number' }] }
			}
			return validateNumberValue(input, opts)
		})
	},

	boolean(): DexSchema<boolean> {
		return createSchema<boolean>((input) => {
			if (typeof input !== 'boolean') {
				return { ok: false, issues: [{ path: [], message: 'Expected boolean' }] }
			}
			return { ok: true, data: input }
		})
	},

	coerce: {
		number(opts?: NumberOptions): DexSchema<number> {
			return createSchema<number>((input) => {
				if (typeof input === 'number') {
					if (Number.isNaN(input)) {
						return { ok: false, issues: [{ path: [], message: 'Expected number' }] }
					}
					return validateNumberValue(input, opts)
				}
				if (typeof input === 'string') {
					const trimmed = input.trim()
					if (trimmed.length === 0) {
						return { ok: false, issues: [{ path: [], message: 'Expected number' }] }
					}
					const parsed = Number(trimmed)
					if (Number.isNaN(parsed)) {
						return { ok: false, issues: [{ path: [], message: 'Expected number' }] }
					}
					return validateNumberValue(parsed, opts)
				}
				return { ok: false, issues: [{ path: [], message: 'Expected number' }] }
			})
		},

		boolean(): DexSchema<boolean> {
			return createSchema<boolean>((input) => {
				if (typeof input === 'boolean') {
					return { ok: true, data: input }
				}
				if (typeof input === 'string') {
					const normalized = input.trim().toLowerCase()
					if (normalized === 'true' || normalized === '1') {
						return { ok: true, data: true }
					}
					if (normalized === 'false' || normalized === '0') {
						return { ok: true, data: false }
					}
				}
				if (typeof input === 'number') {
					if (input === 1) return { ok: true, data: true }
					if (input === 0) return { ok: true, data: false }
				}
				return { ok: false, issues: [{ path: [], message: 'Expected boolean' }] }
			})
		},
	},

	enum<const T extends readonly [string, ...string[]] | readonly (string | number)[]>(
		values: T
	): DexSchema<T[number]> {
		const allowed = new Set<unknown>(values)
		return createSchema<T[number]>((input) => {
			if (!allowed.has(input)) {
				return {
					ok: false,
					issues: [{ path: [], message: `Expected one of: ${values.join(', ')}` }],
				}
			}
			return { ok: true, data: input as T[number] }
		})
	},

	array<S extends Schema<any>>(itemSchema: S): DexSchema<Infer<S>[]> {
		return createSchema<Infer<S>[]>((input) => {
			if (!Array.isArray(input)) {
				return { ok: false, issues: [{ path: [], message: 'Expected array' }] }
			}
			const out: Infer<S>[] = []
			const issues: ValidationIssue[] = []
			for (let i = 0; i < input.length; i++) {
				const res = safeValidate(itemSchema, input[i])
				if (res.ok) {
					out.push(res.data)
				} else {
					for (const issue of res.issues) {
						issues.push({
							path: [i, ...issue.path],
							message: issue.message,
						})
					}
				}
			}
			if (issues.length > 0) {
				return { ok: false, issues }
			}
			return { ok: true, data: out }
		})
	},

	object<Shape extends Record<string, Schema<any>>>(
		shape: Shape
	): DexSchema<ObjectOutput<Shape>> {
		const entries = Object.entries(shape)
		return createSchema<ObjectOutput<Shape>>((input) => {
			if (typeof input !== 'object' || input === null || Array.isArray(input)) {
				return { ok: false, issues: [{ path: [], message: 'Expected object' }] }
			}
			const record = input as Record<string, unknown>
			const out: Record<string, unknown> = {}
			const issues: ValidationIssue[] = []

			for (const [key, fieldSchema] of entries) {
				const ownProp = hasOwn(record, key)
				const rawVal = ownProp ? record[key] : undefined
				const res = safeValidate(fieldSchema, rawVal)
				if (res.ok) {
					if ((res.data !== undefined || ownProp) && !DANGEROUS_KEYS.has(key)) {
						out[key] = res.data
					}
				} else {
					for (const issue of res.issues) {
						issues.push({
							path: [key, ...issue.path],
							message: issue.message,
						})
					}
				}
			}

			if (issues.length > 0) {
				return { ok: false, issues }
			}
			return { ok: true, data: out as ObjectOutput<Shape> }
		})
	},
}

/**
 * Convert a `URL`, `URLSearchParams`, query/URL string, or plain record into a plain object for validation.
 */
export function normalizeQueryInput(
	input: URL | URLSearchParams | string | Record<string, unknown>
): Record<string, unknown> {
	if (input instanceof URL) {
		return searchParamsToRecord(input.searchParams)
	}
	if (input instanceof URLSearchParams) {
		return searchParamsToRecord(input)
	}
	if (typeof input === 'string') {
		if (/^https?:\/\//i.test(input)) {
			try {
				return searchParamsToRecord(new URL(input).searchParams)
			} catch {
				// fall through
			}
		}
		const qIdx = input.indexOf('?')
		if (qIdx !== -1) {
			return searchParamsToRecord(new URLSearchParams(input.slice(qIdx + 1)))
		}
		if (input.startsWith('/')) {
			return {}
		}
		return searchParamsToRecord(new URLSearchParams(input))
	}
	if (input && typeof input === 'object' && !Array.isArray(input)) {
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(input)) {
			if (DANGEROUS_KEYS.has(key)) continue
			out[key] = input[key]
		}
		return out
	}
	return {}
}

function searchParamsToRecord(sp: URLSearchParams): Record<string, string | string[]> {
	const out: Record<string, string | string[]> = {}
	for (const key of sp.keys()) {
		if (DANGEROUS_KEYS.has(key)) continue
		if (hasOwn(out, key)) continue
		const all = sp.getAll(key)
		out[key] = all.length > 1 ? all : (all[0] ?? '')
	}
	return out
}

/**
 * Validate route params against `schema`.
 */
export function validateParams<S extends Schema<any>>(schema: S, params: unknown): Infer<S> {
	return validate(schema, params ?? {})
}

/**
 * Validate query parameters from a `URL`, `URLSearchParams`, URL/query string, or plain object.
 */
export function validateQuery<S extends Schema<any>>(
	schema: S,
	urlOrSearchParams: URL | URLSearchParams | string | Record<string, unknown>
): Infer<S> {
	return validate(schema, normalizeQueryInput(urlOrSearchParams))
}

/**
 * Validate request body against `schema`.
 */
export function validateBody<S extends Schema<any>>(schema: S, body: unknown): Infer<S> {
	return validate(schema, body)
}

type InferOrUndefined<S> = S extends Schema<any> ? Infer<S> : undefined

export type DexValidatedData<
	TParams extends Schema<any> | undefined = undefined,
	TQuery extends Schema<any> | undefined = undefined,
	TBody extends Schema<any> | undefined = undefined,
> = {
	params: InferOrUndefined<TParams>
	query: InferOrUndefined<TQuery>
	body: InferOrUndefined<TBody>
}

/**
 * Elysia middleware/guard helper that validates `params`, `query`, and `body`.
 * Returns HTTP 422 `{ error: 'Validation failed', issues }` on failure and attaches `validated` on success.
 */
export function dexValidate<
	TParams extends Schema<any> | undefined = undefined,
	TQuery extends Schema<any> | undefined = undefined,
	TBody extends Schema<any> | undefined = undefined,
>(schemas: {
	params?: TParams
	query?: TQuery
	body?: TBody
}) {
	return <TApp extends Elysia<any, any, any, any, any, any, any>>(app: TApp) =>
		app
			.error({ DEX_VALIDATION_ERROR: ValidationError })
			.onError(({ error, set }) => {
				if (error instanceof ValidationError) {
					set.status = 422
					return { error: 'Validation failed', issues: error.issues }
				}
			})
			.resolve(async ({ params, query, body }) => {
				const issues: ValidationIssue[] = []

				let validatedParams = undefined as InferOrUndefined<TParams>
				let validatedQuery = undefined as InferOrUndefined<TQuery>
				let validatedBody = undefined as InferOrUndefined<TBody>

				if (schemas.params) {
					const res = await safeValidateAsync(schemas.params, params ?? {})
					if (res.ok) {
						validatedParams = res.data as InferOrUndefined<TParams>
					} else {
						issues.push(...res.issues)
					}
				}

				if (schemas.query) {
					const res = await safeValidateAsync(
						schemas.query,
						normalizeQueryInput((query ?? {}) as Record<string, unknown>)
					)
					if (res.ok) {
						validatedQuery = res.data as InferOrUndefined<TQuery>
					} else {
						issues.push(...res.issues)
					}
				}

				if (schemas.body) {
					const res = await safeValidateAsync(schemas.body, body)
					if (res.ok) {
						validatedBody = res.data as InferOrUndefined<TBody>
					} else {
						issues.push(...res.issues)
					}
				}

				if (issues.length > 0) {
					throw new ValidationError(issues)
				}

				return {
					validated: {
						params: validatedParams,
						query: validatedQuery,
						body: validatedBody,
					} satisfies DexValidatedData<TParams, TQuery, TBody>,
				}
			})
}
