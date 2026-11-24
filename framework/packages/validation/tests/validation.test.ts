import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RouterContext, createStaticRouterState } from '@dex/router/client'
import {
	ValidationError,
	dexValidate,
	normalizeQueryInput,
	safeValidate,
	v,
	validate,
	validateBody,
	validateParams,
	validateQuery,
	type Infer,
	type StandardSchemaV1,
	type ZodLikeSchema,
} from '../src/index'
import { useValidatedParams, useValidatedQuery } from '../src/client'

describe('built-in schema builder (v)', () => {
	it('validates strings with min, max, and pattern', () => {
		const username = v.string({ min: 3, max: 10, pattern: /^[a-z0-9_]+$/g })
		expect(validate(username, 'dex_123')).toBe('dex_123')
		// Ensure global regex flag does not cause stateful alternating failures
		expect(validate(username, 'dex_123')).toBe('dex_123')

		expect(safeValidate(username, 42)).toEqual({
			ok: false,
			issues: [{ path: [], message: 'Expected string' }],
		})
		expect(safeValidate(username, 'ab').ok).toBe(false)
		expect(safeValidate(username, 'too_long_name').ok).toBe(false)
		expect(safeValidate(username, 'Bad-Name!').ok).toBe(false)
	})

	it('validates numbers with min, max, and int', () => {
		const age = v.number({ min: 0, max: 120, int: true })
		expect(validate(age, 25)).toBe(25)
		expect(safeValidate(age, 25.5)).toEqual({
			ok: false,
			issues: [{ path: [], message: 'Expected integer' }],
		})
		expect(safeValidate(age, -1).ok).toBe(false)
		expect(safeValidate(age, 121).ok).toBe(false)
		expect(safeValidate(age, Number.NaN).ok).toBe(false)
		expect(safeValidate(age, Infinity).ok).toBe(false)
		expect(safeValidate(age, '25').ok).toBe(false)
	})

	it('validates booleans and enums', () => {
		expect(validate(v.boolean(), true)).toBe(true)
		expect(safeValidate(v.boolean(), 'true').ok).toBe(false)

		const role = v.enum(['admin', 'member', 'guest'])
		type Role = Infer<typeof role>
		const r: Role = validate(role, 'admin')
		expect(r).toBe('admin')
		expect(safeValidate(role, 'superuser').ok).toBe(false)
	})

	it('coerces numbers and booleans cleanly', () => {
		const num = v.coerce.number({ int: true, min: 1 })
		expect(validate(num, '42')).toBe(42)
		expect(validate(num, ' 7 ')).toBe(7)
		expect(validate(num, 10)).toBe(10)
		expect(safeValidate(num, '').ok).toBe(false)
		expect(safeValidate(num, '   ').ok).toBe(false)
		expect(safeValidate(num, 'abc').ok).toBe(false)
		expect(safeValidate(num, '0').ok).toBe(false)

		const bool = v.coerce.boolean()
		expect(validate(bool, true)).toBe(true)
		expect(validate(bool, 'true')).toBe(true)
		expect(validate(bool, 'TRUE')).toBe(true)
		expect(validate(bool, '1')).toBe(true)
		expect(validate(bool, 1)).toBe(true)
		expect(validate(bool, 'false')).toBe(false)
		expect(validate(bool, '0')).toBe(false)
		expect(validate(bool, 0)).toBe(false)
		expect(safeValidate(bool, 'maybe').ok).toBe(false)
	})

	it('validates objects, arrays, optional(), and default()', () => {
		const userSchema = v.object({
			name: v.string({ min: 1 }),
			role: v.enum(['user', 'admin']).default('user'),
			nickname: v.string().optional(),
			tags: v.array(v.string({ min: 2 })).default([]),
		})

		type User = Infer<typeof userSchema>
		const valid: User = validate(userSchema, { name: 'Alice' })
		expect(valid).toEqual({
			name: 'Alice',
			role: 'user',
			tags: [],
		})
		expect('nickname' in valid).toBe(false)

		const failed = safeValidate(userSchema, { name: '', tags: ['ok', 'x'] })
		expect(failed.ok).toBe(false)
		if (!failed.ok) {
			expect(failed.issues).toEqual([
				{ path: ['name'], message: 'String must be at least 1 characters' },
				{ path: ['tags', 1], message: 'String must be at least 2 characters' },
			])
		}
	})
})

describe('ValidationError', () => {
	it('sets status 422 and exposes issues', () => {
		const schema = v.object({ id: v.coerce.number({ int: true }) })
		let caught: unknown
		try {
			validate(schema, { id: 'nope' })
		} catch (err) {
			caught = err
		}

		expect(caught).toBeInstanceOf(Error)
		expect(caught).toBeInstanceOf(ValidationError)
		const ve = caught as ValidationError
		expect(ve.status).toBe(422)
		expect(ve.issues).toEqual([{ path: ['id'], message: 'Expected number' }])
		expect(ve.message).toContain('id: Expected number')
	})
})

describe('validateParams, validateQuery, and validateBody', () => {
	it('validates route params', () => {
		const paramsSchema = v.object({
			id: v.coerce.number({ int: true, min: 1 }),
		})
		expect(validateParams(paramsSchema, { id: '42' })).toEqual({ id: 42 })
		expect(() => validateParams(paramsSchema, { id: '0' })).toThrow(ValidationError)
	})

	it('validates query from URL, URLSearchParams, string, and Record', () => {
		const querySchema = v.object({
			page: v.coerce.number({ int: true, min: 1 }).default(1),
			published: v.coerce.boolean().optional(),
			tag: v.array(v.string()).optional(),
		})

		expect(validateQuery(querySchema, new URL('https://example.com/posts?page=3&published=true'))).toEqual({
			page: 3,
			published: true,
		})
		expect(validateQuery(querySchema, new URLSearchParams('page=2&tag=ts&tag=bun'))).toEqual({
			page: 2,
			tag: ['ts', 'bun'],
		})
		expect(validateQuery(querySchema, '?page=5&published=0')).toEqual({
			page: 5,
			published: false,
		})
		expect(validateQuery(querySchema, '/posts?page=4')).toEqual({
			page: 4,
		})
		expect(validateQuery(querySchema, '/posts')).toEqual({
			page: 1,
		})
		expect(validateQuery(querySchema, { page: '9' })).toEqual({
			page: 9,
		})
	})

	it('validates request body', () => {
		const bodySchema = v.object({
			title: v.string({ min: 3 }),
			count: v.number({ min: 1 }),
		})
		expect(validateBody(bodySchema, { title: 'Hello', count: 2 })).toEqual({
			title: 'Hello',
			count: 2,
		})
		expect(() => validateBody(bodySchema, null)).toThrow(ValidationError)
	})
})

describe('Standard Schema v1 & Zod-like compatibility', () => {
	it('supports Standard Schema v1 (~standard.validate)', () => {
		const stdSchema: StandardSchemaV1<unknown, { email: string }> = {
			'~standard': {
				version: 1,
				vendor: 'custom-std',
				validate(value) {
					if (
						typeof value === 'object' &&
						value !== null &&
						typeof (value as any).email === 'string' &&
						(value as any).email.includes('@')
					) {
						return { value: { email: (value as any).email } }
					}
					return {
						issues: [{ path: [{ key: 'email' }], message: 'Invalid email' }],
					}
				},
			},
		}

		type Out = Infer<typeof stdSchema>
		const ok: Out = validate(stdSchema, { email: 'a@b.com' })
		expect(ok).toEqual({ email: 'a@b.com' })

		const bad = safeValidate(stdSchema, { email: 'bad' })
		expect(bad).toEqual({
			ok: false,
			issues: [{ path: ['email'], message: 'Invalid email' }],
		})

		// Built-in v.* schemas also implement Standard Schema v1
		const builtIn = v.string({ min: 2 })
		expect(builtIn['~standard'].version).toBe(1)
		expect(builtIn['~standard'].validate('ok')).toEqual({ value: 'ok' })
	})

	it('supports Zod-like schemas with safeParse', () => {
		const zodLike: ZodLikeSchema<{ port: number }> = {
			safeParse(input) {
				if (typeof input === 'object' && input !== null && typeof (input as any).port === 'number') {
					return { success: true, data: { port: (input as any).port } }
				}
				return {
					success: false,
					error: {
						issues: [{ path: ['port'], message: 'Expected number' }],
					},
				}
			},
		}

		type Out = Infer<typeof zodLike>
		const ok: Out = validate(zodLike, { port: 3000 })
		expect(ok).toEqual({ port: 3000 })

		expect(safeValidate(zodLike, { port: '3000' })).toEqual({
			ok: false,
			issues: [{ path: ['port'], message: 'Expected number' }],
		})
	})

	it('composes Standard Schema and Zod-like schemas inside v.object', () => {
		const zodEmail: ZodLikeSchema<string> = {
			safeParse(input) {
				if (typeof input === 'string' && input.includes('@')) {
					return { success: true, data: input }
				}
				return { success: false, error: { issues: [{ path: [], message: 'Bad email' }] } }
			},
		}

		const payload = v.object({
			id: v.coerce.number(),
			email: zodEmail,
		})

		expect(validate(payload, { id: '5', email: 'dev@dex.dev' })).toEqual({
			id: 5,
			email: 'dev@dex.dev',
		})
		expect(safeValidate(payload, { id: '5', email: 'nope' })).toEqual({
			ok: false,
			issues: [{ path: ['email'], message: 'Bad email' }],
		})
	})
})

describe('dexValidate Elysia middleware', () => {
	it('validates params, query, and body and attaches validated data', async () => {
		const app = new Elysia()
			.use(
				dexValidate({
					params: v.object({ id: v.coerce.number({ int: true, min: 1 }) }),
					query: v.object({ verbose: v.coerce.boolean().default(false) }),
					body: v.object({ name: v.string({ min: 2 }) }),
				})
			)
			.post('/users/:id', ({ validated }) => validated)

		const okRes = await app.handle(
			new Request('http://localhost/users/7?verbose=true', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'Ada' }),
			})
		)
		expect(okRes.status).toBe(200)
		expect(await okRes.json()).toEqual({
			params: { id: 7 },
			query: { verbose: true },
			body: { name: 'Ada' },
		})

		const badRes = await app.handle(
			new Request('http://localhost/users/abc?verbose=maybe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: 'A' }),
			})
		)
		expect(badRes.status).toBe(422)
		const badJson = (await badRes.json()) as { error: string; issues: { path: any[]; message: string }[] }
		expect(badJson.error).toBe('Validation failed')
		expect(badJson.issues.length).toBe(3)
		expect(badJson.issues.map((i) => i.path)).toEqual([['id'], ['verbose'], ['name']])
	})
})

describe('client hooks (useValidatedParams & useValidatedQuery)', () => {
	it('returns validated result or throws in strict mode', () => {
		const paramsSchema = v.object({ id: v.coerce.number({ int: true }) })
		const querySchema = v.object({ page: v.coerce.number({ int: true, min: 1 }).default(1) })

		let paramsResult: unknown
		let queryResult: unknown
		function ValidPage() {
			paramsResult = useValidatedParams(paramsSchema)
			queryResult = useValidatedQuery(querySchema)
			return React.createElement('div', null, 'ok')
		}

		const okState = createStaticRouterState('/users/42?page=3', { id: '42' })
		renderToStaticMarkup(
			React.createElement(RouterContext.Provider, { value: okState }, React.createElement(ValidPage))
		)
		expect(paramsResult).toEqual({ ok: true, data: { id: 42 } })
		expect(queryResult).toEqual({ ok: true, data: { page: 3 } })

		function StrictPage() {
			const params = useValidatedParams(paramsSchema, { strict: true })
			return React.createElement('div', null, String(params.id))
		}
		const badState = createStaticRouterState('/users/not-a-number', { id: 'not-a-number' })
		expect(() =>
			renderToStaticMarkup(
				React.createElement(RouterContext.Provider, { value: badState }, React.createElement(StrictPage))
			)
		).toThrow(ValidationError)
	})
})

describe('prototype pollution and Object.prototype leak protection', () => {
	it('does not leak Object.prototype properties in v.object', () => {
		const schema = v.object({
			toString: v.string().optional(),
			constructor: v.string().optional(),
			name: v.string().default('anon'),
		})

		const result = validate(schema, {})
		expect<unknown>(result).toEqual({ name: 'anon' })
		expect(Object.prototype.hasOwnProperty.call(result, 'toString')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false)

		const withOwnToString = validate(schema, { toString: 'custom' })
		expect(Object.prototype.hasOwnProperty.call(withOwnToString, 'toString')).toBe(true)
		expect<unknown>(withOwnToString.toString).toBe('custom')

		const strictToString = v.object({ toString: v.string() })
		expect(safeValidate(strictToString, {}).ok).toBe(false)
	})

	it('skips dangerous keys (__proto__, constructor, prototype) in v.object, searchParams, and normalizeQueryInput', () => {
		const dangerousShape = Object.defineProperty(
			{ name: v.string() },
			'__proto__',
			{ value: v.object({ polluted: v.boolean().optional() }).optional(), enumerable: true }
		)
		// Build a shape with constructor and prototype as well
		const objSchema = v.object({
			...dangerousShape,
			constructor: v.string().optional(),
			prototype: v.string().optional(),
		})
		const parsedInput = JSON.parse('{"__proto__":{"polluted":true},"constructor":"evil","prototype":"bad","name":"ok"}')
		const validated = validate(objSchema, parsedInput)
		expect<unknown>(validated).toEqual({ name: 'ok' })
		expect((Object.prototype as any).polluted).toBeUndefined()
		expect(Object.prototype.hasOwnProperty.call(validated, '__proto__')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(validated, 'constructor')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(validated, 'prototype')).toBe(false)

		// URLSearchParams: dangerous keys skipped, Object.prototype keys like toString preserved
		const normalizedSp = normalizeQueryInput(
			new URLSearchParams('__proto__=evil&constructor=bad&prototype=nope&toString=hello&page=2')
		)
		expect(Object.prototype.hasOwnProperty.call(normalizedSp, '__proto__')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(normalizedSp, 'constructor')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(normalizedSp, 'prototype')).toBe(false)
		expect<unknown>(normalizedSp['toString']).toBe('hello')
		expect(normalizedSp.page).toBe('2')
		expect((Object.prototype as any).polluted).toBeUndefined()

		// Plain record passed to normalizeQueryInput: shallow-copied without dangerous keys
		const normalizedRec = normalizeQueryInput(parsedInput)
		expect(Object.prototype.hasOwnProperty.call(normalizedRec, '__proto__')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(normalizedRec, 'constructor')).toBe(false)
		expect(Object.prototype.hasOwnProperty.call(normalizedRec, 'prototype')).toBe(false)
		expect(normalizedRec.name).toBe('ok')
		expect((Object.prototype as any).polluted).toBeUndefined()
	})
})
