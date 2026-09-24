import { describe, expect, it } from 'bun:test'
import {
	compareRouteSegments,
	getSegmentScore,
	sortRoutesByPrecedence,
} from '../src/generate'
import type { RouteSegment } from '../src/types'

describe('Route segment scoring', () => {
	it('assigns correct scores to segment kinds', () => {
		expect(getSegmentScore({ kind: 'static', value: 'home' })).toBe(3)
		expect(getSegmentScore({ kind: 'param', name: 'id' })).toBe(2)
		expect(getSegmentScore({ kind: 'catchAll', name: 'slug' })).toBe(1)
	})
})

describe('Route precedence comparison and sorting', () => {
	it('places static segments before dynamic parameter segments', () => {
		const staticSeg: RouteSegment[] = [
			{ kind: 'static', value: 'posts' },
			{ kind: 'static', value: 'new' },
		]
		const paramSeg: RouteSegment[] = [
			{ kind: 'static', value: 'posts' },
			{ kind: 'param', name: 'slug' },
		]

		expect(compareRouteSegments(staticSeg, paramSeg)).toBeLessThan(0)
		expect(compareRouteSegments(paramSeg, staticSeg)).toBeGreaterThan(0)
	})

	it('places dynamic parameter segments before catchAll segments', () => {
		const paramSeg: RouteSegment[] = [
			{ kind: 'static', value: 'posts' },
			{ kind: 'param', name: 'slug' },
		]
		const catchAllSeg: RouteSegment[] = [
			{ kind: 'static', value: 'posts' },
			{ kind: 'catchAll', name: 'rest' },
		]

		expect(compareRouteSegments(paramSeg, catchAllSeg)).toBeLessThan(0)
		expect(compareRouteSegments(catchAllSeg, paramSeg)).toBeGreaterThan(0)
	})

	it('sorts a list of routes with full precedence hierarchy', () => {
		const routes = [
			{
				path: '/[...catchAll]',
				segments: [{ kind: 'catchAll' as const, name: 'catchAll' }],
			},
			{
				path: '/posts/[slug]',
				segments: [
					{ kind: 'static' as const, value: 'posts' },
					{ kind: 'param' as const, name: 'slug' },
				],
			},
			{
				path: '/posts/new',
				segments: [
					{ kind: 'static' as const, value: 'posts' },
					{ kind: 'static' as const, value: 'new' },
				],
			},
			{
				path: '/posts/[...all]',
				segments: [
					{ kind: 'static' as const, value: 'posts' },
					{ kind: 'catchAll' as const, name: 'all' },
				],
			},
			{
				path: '/about',
				segments: [{ kind: 'static' as const, value: 'about' }],
			},
			{
				path: '/',
				segments: [],
			},
		]

		const sorted = sortRoutesByPrecedence([...routes])

		// Expected order:
		// 1. /about (1 static)
		// 2. /posts/new (2 static)
		// 3. /posts/[slug] (1 static, 1 param)
		// 4. /posts/[...all] (1 static, 1 catchAll)
		// 5. / (0 segments)
		// 6. /[...catchAll] (1 catchAll)
		const paths = sorted.map((r) => r.path)
		expect(paths.indexOf('/posts/new')).toBeLessThan(paths.indexOf('/posts/[slug]'))
		expect(paths.indexOf('/posts/[slug]')).toBeLessThan(paths.indexOf('/posts/[...all]'))
		expect(paths.indexOf('/posts/[...all]')).toBeLessThan(paths.indexOf('/[...catchAll]'))
	})
})
