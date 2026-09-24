import { describe, expect, it } from 'bun:test'
import {
	findMatchingRoute,
	matchRoute,
	normalizePathname,
	splitPathname,
} from '../src/client/router'
import type { Route, RouteSegment } from '../src/types'

describe('Path normalization and splitting', () => {
	it('normalizes paths with trailing slashes and empty paths', () => {
		expect(normalizePathname('')).toBe('/')
		expect(normalizePathname('/')).toBe('/')
		expect(normalizePathname('/posts/')).toBe('/posts')
		expect(normalizePathname('/posts/123/')).toBe('/posts/123')
		expect(normalizePathname('/a/b/c/')).toBe('/a/b/c')
	})

	it('splits paths into segments correctly', () => {
		expect(splitPathname('')).toEqual([])
		expect(splitPathname('/')).toEqual([])
		expect(splitPathname('/posts')).toEqual(['posts'])
		expect(splitPathname('/posts/123')).toEqual(['posts', '123'])
		expect(splitPathname('/a/b/c/')).toEqual(['a', 'b', 'c'])
	})
})

describe('Route matching with matchRoute', () => {
	it('matches root static route', () => {
		const segments: RouteSegment[] = []
		expect(matchRoute(segments, '/')).toEqual({})
		expect(matchRoute(segments, '/posts')).toBeNull()
	})

	it('matches static routes', () => {
		const segments: RouteSegment[] = [{ kind: 'static', value: 'about' }]
		expect(matchRoute(segments, '/about')).toEqual({})
		expect(matchRoute(segments, '/about/')).toEqual({})
		expect(matchRoute(segments, '/contact')).toBeNull()
		expect(matchRoute(segments, '/about/team')).toBeNull()
	})

	it('matches dynamic parameters', () => {
		const segments: RouteSegment[] = [
			{ kind: 'static', value: 'posts' },
			{ kind: 'param', name: 'id' },
		]
		expect(matchRoute(segments, '/posts/42')).toEqual({ id: '42' })
		expect(matchRoute(segments, '/posts/hello-world')).toEqual({ id: 'hello-world' })
		expect(matchRoute(segments, '/posts')).toBeNull()
		expect(matchRoute(segments, '/posts/42/comments')).toBeNull()
	})

	it('decodes URI encoded parameters safely', () => {
		const segments: RouteSegment[] = [
			{ kind: 'static', value: 'tags' },
			{ kind: 'param', name: 'tag' },
		]
		expect(matchRoute(segments, '/tags/c%2B%2B')).toEqual({ tag: 'c++' })
		expect(matchRoute(segments, '/tags/hello%20world')).toEqual({ tag: 'hello world' })
		// Malformed URI component falls back safely to raw string
		expect(matchRoute(segments, '/tags/%E0%A4%A')).toEqual({ tag: '%E0%A4%A' })
	})

	it('matches catch-all routes', () => {
		const segments: RouteSegment[] = [
			{ kind: 'static', value: 'docs' },
			{ kind: 'catchAll', name: 'slug' },
		]
		expect(matchRoute(segments, '/docs')).toEqual({ slug: [] })
		expect(matchRoute(segments, '/docs/getting-started')).toEqual({
			slug: ['getting-started'],
		})
		expect(matchRoute(segments, '/docs/v1/api/auth')).toEqual({
			slug: ['v1', 'api', 'auth'],
		})
		expect(matchRoute(segments, '/blog/getting-started')).toBeNull()
	})

	it('matches root catch-all route', () => {
		const segments: RouteSegment[] = [{ kind: 'catchAll', name: 'all' }]
		expect(matchRoute(segments, '/')).toEqual({ all: [] })
		expect(matchRoute(segments, '/hello/world/test')).toEqual({
			all: ['hello', 'world', 'test'],
		})
	})
})

describe('findMatchingRoute', () => {
	const mockRoutes: Route[] = [
		{
			file: 'index.tsx',
			path: '/',
			segments: [],
			importPage: () => Promise.resolve({ default: () => null }),
		},
		{
			file: 'posts/new.tsx',
			path: '/posts/new',
			segments: [
				{ kind: 'static', value: 'posts' },
				{ kind: 'static', value: 'new' },
			],
			importPage: () => Promise.resolve({ default: () => null }),
		},
		{
			file: 'posts/[id].tsx',
			path: '/posts/[id]',
			segments: [
				{ kind: 'static', value: 'posts' },
				{ kind: 'param', name: 'id' },
			],
			importPage: () => Promise.resolve({ default: () => null }),
		},
		{
			file: 'docs/[...slug].tsx',
			path: '/docs/[...slug]',
			segments: [
				{ kind: 'static', value: 'docs' },
				{ kind: 'catchAll', name: 'slug' },
			],
			importPage: () => Promise.resolve({ default: () => null }),
		},
	]

	it('finds exact static match first', () => {
		const match = findMatchingRoute(mockRoutes, '/posts/new')
		expect(match).not.toBeNull()
		expect(match?.route.file).toBe('posts/new.tsx')
		expect(match?.params).toEqual({})
	})

	it('finds param route when static does not match', () => {
		const match = findMatchingRoute(mockRoutes, '/posts/123')
		expect(match).not.toBeNull()
		expect(match?.route.file).toBe('posts/[id].tsx')
		expect(match?.params).toEqual({ id: '123' })
	})

	it('finds catchAll route for arbitrary nested paths', () => {
		const match = findMatchingRoute(mockRoutes, '/docs/router/prefetching')
		expect(match).not.toBeNull()
		expect(match?.route.file).toBe('docs/[...slug].tsx')
		expect(match?.params).toEqual({ slug: ['router', 'prefetching'] })
	})

	it('returns null for non-matching paths', () => {
		const match = findMatchingRoute(mockRoutes, '/non-existent')
		expect(match).toBeNull()
	})
})
