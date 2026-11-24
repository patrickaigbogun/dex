import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
	Link,
	RouterContext,
	RouterErrorBoundary,
	createStaticRouterState,
	hasUnsafeScheme,
	resolveMainDomainSubdomainRedirect,
	resolveSubdomainMount,
	toExternalHref,
	toExternalPathname,
	toInternalPathname,
	useLocation,
	useParams,
	useQuery,
} from '../src/client/router'

const originalWindow = (globalThis as any).window

function withMockWindow(loc: Partial<Location>, fn: () => void) {
	;(globalThis as any).window = {
		location: {
			protocol: 'https:',
			hostname: 'example.com',
			port: '',
			origin: 'https://example.com',
			pathname: '/',
			search: '',
			hash: '',
			...loc,
		},
	}
	try {
		fn()
	} finally {
		if (originalWindow === undefined) {
			delete (globalThis as any).window
		} else {
			;(globalThis as any).window = originalWindow
		}
	}
}

afterEach(() => {
	if (originalWindow === undefined) {
		delete (globalThis as any).window
	} else {
		;(globalThis as any).window = originalWindow
	}
})

describe('Subdomain routing helpers', () => {
	it('resolveSubdomainMount returns null when window is undefined or on localhost/IP', () => {
		expect(resolveSubdomainMount({ blog: '/blog' })).toBeNull()

		withMockWindow({ hostname: 'localhost' }, () => {
			expect(resolveSubdomainMount({ blog: '/blog' })).toBeNull()
		})

		withMockWindow({ hostname: '127.0.0.1' }, () => {
			expect(resolveSubdomainMount({ blog: '/blog' })).toBeNull()
		})
	})

	it('resolveSubdomainMount defaults to empty subdomains and honors explicit subdomains', () => {
		withMockWindow({ hostname: 'blog.example.com' }, () => {
			expect(resolveSubdomainMount()).toBeNull()
			expect(resolveSubdomainMount({ blog: '/blog/' })).toBe('/blog')
			expect(resolveSubdomainMount({ docs: '/docs' })).toBeNull()
		})
	})

	it('toInternalPathname prefixes browser paths when mounted on subdomain', () => {
		expect(toInternalPathname('/', null)).toBe('/')
		expect(toInternalPathname('/about/', null)).toBe('/about')
		expect(toInternalPathname('/', '/blog')).toBe('/blog')
		expect(toInternalPathname('/hello', '/blog')).toBe('/blog/hello')
		expect(toInternalPathname('/blog', '/blog')).toBe('/blog')
		expect(toInternalPathname('/blog/hello', '/blog')).toBe('/blog/hello')
	})

	it('toExternalPathname strips mountPrefix when mounted on subdomain', () => {
		expect(toExternalPathname('/blog/', null)).toBe('/blog')
		expect(toExternalPathname('/blog', '/blog')).toBe('/')
		expect(toExternalPathname('/blog/hello', '/blog')).toBe('/hello')
		expect(toExternalPathname('/other', '/blog')).toBe('/other')
		expect(toExternalPathname('/blog//evil.com', '/blog')).toBe('/evil.com')
	})

	it('toExternalHref rewrites same-origin URLs using mountPrefix', () => {
		expect(toExternalHref(undefined, '/blog')).toBe('')
		expect(toExternalHref('/blog/post?x=1#top', '/blog')).toBe('/blog/post?x=1#top')

		withMockWindow({ origin: 'https://blog.example.com', hostname: 'blog.example.com' }, () => {
			expect(toExternalHref('/blog/post?x=1#top', '/blog')).toBe('/post?x=1#top')
			expect(toExternalHref('/blog', '/blog')).toBe('/')
			expect(toExternalHref('https://other.example.com/blog/post', '/blog')).toBe(
				'https://other.example.com/blog/post'
			)
		})
	})

	it('resolveMainDomainSubdomainRedirect redirects matching prefix on main domain only', () => {
		expect(resolveMainDomainSubdomainRedirect('/blog/post', '', '', { blog: '/blog' })).toBeNull()

		withMockWindow({ protocol: 'https:', hostname: 'example.com', port: '' }, () => {
			expect(resolveMainDomainSubdomainRedirect('/blog/post', '?q=1', '#sec')).toBeNull()
			expect(resolveMainDomainSubdomainRedirect('/blog/post', '?q=1', '#sec', { blog: '/blog' })).toBe(
				'https://blog.example.com/post?q=1#sec'
			)
			expect(resolveMainDomainSubdomainRedirect('/about', '', '', { blog: '/blog' })).toBeNull()
		})

		withMockWindow({ protocol: 'http:', hostname: 'www.example.com', port: '3000' }, () => {
			expect(resolveMainDomainSubdomainRedirect('/blog', '', '', { blog: '/blog' })).toBe(
				'http://blog.example.com:3000/'
			)
		})

		withMockWindow({ protocol: 'https:', hostname: 'blog.example.com', port: '' }, () => {
			expect(resolveMainDomainSubdomainRedirect('/blog/post', '', '', { blog: '/blog' })).toBeNull()
		})

		withMockWindow({ protocol: 'http:', hostname: 'app.localhost', port: '' }, () => {
			expect(resolveMainDomainSubdomainRedirect('/blog', '', '', { blog: '/blog' })).toBeNull()
		})
	})
})

describe('createStaticRouterState', () => {
	it('creates a static RouterState supporting hooks and Link during SSR/SSG', async () => {
		const state = createStaticRouterState('/posts/42/?sort=asc#comments', { id: '42' })
		expect(state.pathname).toBe('/posts/42')
		expect(state.search).toBe('?sort=asc')
		expect(state.hash).toBe('#comments')
		expect(state.params).toEqual({ id: '42' })
		expect(state.query.get('sort')).toBe('asc')
		expect(state.isNavigating).toBe(false)
		expect(state.resolveHref('/about')).toBe('/about')
		await expect(state.prefetch('/about')).resolves.toBeUndefined()
		expect(() => state.navigate('/about')).not.toThrow()

		function PrerenderedPage() {
			const loc = useLocation()
			const params = useParams<{ id: string }>()
			const query = useQuery()
			return (
				<div>
					<span>{`${loc.pathname}:${params.id}:${query.get('sort')}`}</span>
					<Link to="/home">Home</Link>
				</div>
			)
		}

		const html = renderToStaticMarkup(
			<RouterContext.Provider value={state}>
				<PrerenderedPage />
			</RouterContext.Provider>
		)

		expect(html).toContain('/posts/42:42:asc')
		expect(html).toContain('<a href="/home">Home</a>')
	})
})

describe('<Link> prop validation', () => {
	it('throws when both to and href are missing or non-string', () => {
		expect(() => renderToStaticMarkup(<Link>Broken</Link>)).toThrow(
			'[dex-router] <Link> requires a valid "to" or "href" destination prop.'
		)
		expect(() => renderToStaticMarkup(<Link to={123 as any}>Broken</Link>)).toThrow(
			'[dex-router] <Link> requires a valid "to" or "href" destination prop.'
		)
	})

	it('accepts either to or href and neutralizes unsafe schemes', () => {
		expect(renderToStaticMarkup(<Link to="/about">About</Link>)).toBe('<a href="/about">About</a>')
		expect(renderToStaticMarkup(<Link href="/docs">Docs</Link>)).toBe('<a href="/docs">Docs</a>')
		expect(renderToStaticMarkup(<Link to="javascript:alert(1)">XSS</Link>)).toBe('<a href="#">XSS</a>')
		expect(hasUnsafeScheme('java\tscript:alert(1)')).toBe(true)
		expect(hasUnsafeScheme('\x01javascript:alert(1)')).toBe(true)
		expect(hasUnsafeScheme('//evil.com')).toBe(true)
		expect(hasUnsafeScheme('/\\evil.com')).toBe(true)
		expect(hasUnsafeScheme('https://example.com')).toBe(false)
		expect(hasUnsafeScheme('/safe/path')).toBe(false)
	})
})

describe('RouterErrorBoundary', () => {
	it('resets error state when resetKey changes', () => {
		const nextState = RouterErrorBoundary.getDerivedStateFromProps(
			{ children: null, resetKey: '/new' },
			{ hasError: true, error: new Error('boom'), prevResetKey: '/old' }
		)
		expect(nextState).toEqual({ hasError: false, error: null, prevResetKey: '/new' })

		const unchangedState = RouterErrorBoundary.getDerivedStateFromProps(
			{ children: null, resetKey: '/old' },
			{ hasError: true, error: new Error('boom'), prevResetKey: '/old' }
		)
		expect(unchangedState).toBeNull()
	})
})
