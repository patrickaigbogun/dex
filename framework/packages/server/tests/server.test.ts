import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import {
	buildGoogleFontsUrl,
	dexAssetsRoute,
	dexSpaFallback,
	generateFontThemeCss,
	injectGoogleFonts,
	injectHeadMeta,
} from '../src/index'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'

describe('dexAssetsRoute', () => {
	const tmpDir = path.join(os.tmpdir(), `dex-test-assets-${Date.now()}`)
	mkdirSync(tmpDir, { recursive: true })
	writeFileSync(path.join(tmpDir, 'test.txt'), 'hello dex static assets')

	try {
		const app = new Elysia().use(
			dexAssetsRoute({
				assetsDir: tmpDir,
			})
		)

		it('serves static assets under /assets/*', async () => {
			const res = await app.handle(new Request('http://localhost/assets/test.txt'))
			expect(res.status).toBe(200)
			const text = await res.text()
			expect(text).toBe('hello dex static assets')
		})

		it('blocks invalid asset paths attempting empty or invalid traversal', async () => {
			const res = await app.handle(new Request('http://localhost/assets/'))
			expect(res.status).toBe(400)

			const resBackslash = await app.handle(new Request('http://localhost/assets/%2e%2e%5csecret.txt'))
			expect(resBackslash.status).toBe(400)
		})
	} finally {
		// cleanup after tests run
	}
})

describe('dexSpaFallback', () => {
	const tmpDir = path.join(os.tmpdir(), `dex-test-spa-${Date.now()}`)
	mkdirSync(tmpDir, { recursive: true })
	const indexPath = path.join(tmpDir, 'index.html')
	writeFileSync(
		indexPath,
		'<!DOCTYPE html><html><head><title>App</title></head><body><div id="root"></div></body></html>'
	)

	const app = new Elysia().use(
		dexSpaFallback({
			indexHtmlPath: indexPath,
		})
	)

	it('returns index.html for page routes', async () => {
		const res = await app.handle(
			new Request('http://localhost/dashboard/settings', {
				headers: { accept: 'text/html' },
			})
		)
		expect(res.status).toBe(200)
		const html = await res.text()
		expect(html).toContain('<div id="root"></div>')
	})

	it('ignores api routes and assets', async () => {
		const resApi = await app.handle(
			new Request('http://localhost/api/users', {
				headers: { accept: 'text/html' },
			})
		)
		expect(resApi.status).toBe(404)

		const resAsset = await app.handle(
			new Request('http://localhost/assets/bundle.js', {
				headers: { accept: 'text/html' },
			})
		)
		expect(resAsset.status).toBe(404)
	})

	it('serves prerendered SSG file from buildDir or ssgDir before index.html fallback', async () => {
		const ssgTmp = path.join(os.tmpdir(), `dex-test-ssg-${Date.now()}`)
		const ssgDir = path.join(ssgTmp, '__ssg')
		mkdirSync(path.join(ssgTmp, 'about'), { recursive: true })
		mkdirSync(path.join(ssgDir, 'pricing'), { recursive: true })
		mkdirSync(ssgDir, { recursive: true })

		const rootHtml = path.join(ssgTmp, 'index.html')
		writeFileSync(rootHtml, '<!DOCTYPE html><html><head></head><body>SPA Root</body></html>')
		writeFileSync(
			path.join(ssgTmp, 'about', 'index.html'),
			'<!DOCTYPE html><html><head></head><body>SSG About</body></html>'
		)
		writeFileSync(
			path.join(ssgDir, 'pricing', 'index.html'),
			'<!DOCTYPE html><html><head></head><body>SSG Pricing</body></html>'
		)
		writeFileSync(
			path.join(ssgDir, 'index.html'),
			'<!DOCTYPE html><html><head></head><body>SSG Home</body></html>'
		)

		const ssgApp = new Elysia().use(
			dexSpaFallback({
				indexHtmlPath: rootHtml,
				ssgDir,
			})
		)

		try {
			const resHome = await ssgApp.handle(
				new Request('http://localhost/', { headers: { accept: 'text/html' } })
			)
			expect(resHome.status).toBe(200)
			expect(await resHome.text()).toContain('SSG Home')

			const resAbout = await ssgApp.handle(
				new Request('http://localhost/about', { headers: { accept: 'text/html' } })
			)
			expect(resAbout.status).toBe(200)
			expect(await resAbout.text()).toContain('SSG About')

			const resPricing = await ssgApp.handle(
				new Request('http://localhost/pricing/', { headers: { accept: 'text/html' } })
			)
			expect(resPricing.status).toBe(200)
			expect(await resPricing.text()).toContain('SSG Pricing')

			const resFallback = await ssgApp.handle(
				new Request('http://localhost/unknown/route', { headers: { accept: 'text/html' } })
			)
			expect(resFallback.status).toBe(200)
			expect(await resFallback.text()).toContain('SPA Root')
		} finally {
			rmSync(ssgTmp, { recursive: true, force: true })
		}
	})

	it('injects head metadata via injectHeadMeta and resolveHead', async () => {
		const baseHtml = '<!DOCTYPE html><html><head><title>Default</title></head><body></body></html>'
		const injected = injectHeadMeta(baseHtml, {
			title: 'About Us',
			description: 'Learn more about Dex',
			ogImage: 'https://example.com/og.png',
		})
		expect(injected).toContain('<title>About Us</title>')
		expect(injected).not.toContain('<title>Default</title>')
		expect(injected).toContain('<meta name="description" content="Learn more about Dex" />')
		expect(injected).toContain('<meta property="og:image" content="https://example.com/og.png" />')
		expect(injected).toContain('<meta name="twitter:card" content="summary_large_image" />')

		const headApp = new Elysia().use(
			dexSpaFallback({
				indexHtmlPath: indexPath,
				resolveHead: ({ pathname }) => ({
					title: `Page: ${pathname}`,
					description: 'Dynamic description',
				}),
			})
		)

		const res = await headApp.handle(
			new Request('http://localhost/docs', { headers: { accept: 'text/html' } })
		)
		expect(res.status).toBe(200)
		const html = await res.text()
		expect(html).toContain('<title>Page: /docs</title>')
		expect(html).toContain('<meta name="description" content="Dynamic description" />')
	})

	it('performs canonical 308 subdomain redirects when subdomains are configured', async () => {
		const subApp = new Elysia().use(
			dexSpaFallback({
				indexHtmlPath: indexPath,
				subdomains: { blog: '/blog' },
			})
		)

		const resRootToSub = await subApp.handle(
			new Request('https://example.com/blog/hello-world?ref=1', {
				headers: { host: 'example.com', accept: 'text/html' },
			})
		)
		expect(resRootToSub.status).toBe(308)
		expect(resRootToSub.headers.get('location')).toBe('https://blog.example.com/hello-world?ref=1')

		const resSubStripPrefix = await subApp.handle(
			new Request('https://blog.example.com/blog', {
				headers: { host: 'blog.example.com', accept: 'text/html' },
			})
		)
		expect(resSubStripPrefix.status).toBe(308)
		expect(resSubStripPrefix.headers.get('location')).toBe('https://blog.example.com/')

		// Without subdomains configured, /blog serves normal SPA fallback
		const resNoSub = await app.handle(
			new Request('https://example.com/blog', {
				headers: { host: 'example.com', accept: 'text/html' },
			})
		)
		expect(resNoSub.status).toBe(200)
	})

	it('rejects %2e%2e%5c traversal in dexSpaFallback', async () => {
		const res = await app.handle(
			new Request('http://localhost/%2e%2e%5csecret', {
				headers: { accept: 'text/html' },
			})
		)
		expect(res.status).toBe(400)
	})

	it("preserves $' sequences in injectHeadMeta title without corrupting HTML", () => {
		const baseHtml = '<!DOCTYPE html><html><head><title>Old</title></head><body><p>Body</p></body></html>'
		const out = injectHeadMeta(baseHtml, {
			title: "Price $' & $& Special",
			description: "Desc $' here",
		})
		expect(out).toContain("<title>Price $' &amp; $&amp; Special</title>")
		expect(out).toContain('content="Desc $&#39; here"')
		expect(out).toContain('<body><p>Body</p></body>')
	})

	it('ignores untrusted X-Forwarded-Host unless trustProxy is true', async () => {
		const untrustedApp = new Elysia().use(
			dexSpaFallback({
				indexHtmlPath: indexPath,
				subdomains: { blog: '/blog' },
			})
		)
		const resUntrusted = await untrustedApp.handle(
			new Request('https://example.com/blog/post', {
				headers: {
					host: 'example.com',
					'x-forwarded-host': 'evil.attacker.com',
					'x-forwarded-proto': 'http',
					accept: 'text/html',
				},
			})
		)
		expect(resUntrusted.status).toBe(308)
		expect(resUntrusted.headers.get('location')).toBe('https://blog.example.com/post')

		const trustedApp = new Elysia().use(
			dexSpaFallback({
				indexHtmlPath: indexPath,
				subdomains: { blog: '/blog' },
				trustProxy: true,
			})
		)
		const resTrusted = await trustedApp.handle(
			new Request('https://internal.local/blog/post', {
				headers: {
					host: 'internal.local',
					'x-forwarded-host': 'proxy.example.com',
					'x-forwarded-proto': 'https',
					accept: 'text/html',
				},
			})
		)
		expect(resTrusted.status).toBe(308)
		expect(resTrusted.headers.get('location')).toBe('https://blog.proxy.example.com/post')
	})
})

describe('fonts utilities', () => {
	it('builds Google Fonts CSS2 URL from string shorthand and spec objects', () => {
		const url = buildGoogleFontsUrl({
			sans: 'Inter',
			mono: 'JetBrains Mono',
		})
		expect(url).toBe(
			'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap'
		)

		const customUrl = buildGoogleFontsUrl({
			heading: { family: 'Playfair Display', weights: '400;700', ital: true, display: 'optional' },
			local: { family: 'CustomLocal', provider: 'none' },
		})
		expect(customUrl).toBe(
			'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=optional'
		)

		expect(buildGoogleFontsUrl({ local: { family: 'Local', provider: 'none' } })).toBeNull()
	})

	it('injects Google Fonts links and CSS variables into HTML idempotently', () => {
		const html = '<!DOCTYPE html><html><head><title>App</title></head><body></body></html>'
		const out = injectGoogleFonts(html, {
			sans: 'Inter',
			mono: 'JetBrains Mono',
		})
		expect(out).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">')
		expect(out).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
		expect(out).toContain(
			'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&amp;family=JetBrains+Mono:wght@100..900&amp;display=swap">'
		)
		expect(out).toContain('<style id="dex-fonts-theme">')
		expect(out).toContain("--font-sans: 'Inter', sans-serif;")
		expect(out).toContain("--font-mono: 'JetBrains Mono', sans-serif;")
		expect(out).toContain('.font-sans { font-family: var(--font-sans); }')
		expect(out).toContain('.font-mono { font-family: var(--font-mono); }')

		// Idempotent on second call
		expect(injectGoogleFonts(out, { sans: 'Inter' })).toBe(out)
	})

	it('generates Tailwind v4 @theme CSS block', () => {
		const css = generateFontThemeCss({
			sans: 'Inter',
			heading: { family: 'Plus Jakarta Sans' },
			mono: 'JetBrains Mono',
		})
		expect(css).toContain('@theme {')
		expect(css).toContain("--font-sans: 'Inter', sans-serif;")
		expect(css).toContain("--font-heading: 'Plus Jakarta Sans', sans-serif;")
		expect(css).toContain("--font-mono: 'JetBrains Mono', sans-serif;")
	})

	it('sanitizes malicious variable, weights, display, and family CSS characters in injectGoogleFonts', () => {
		const html = '<!DOCTYPE html><html><head><title>App</title></head><body></body></html>'
		const out = injectGoogleFonts(html, {
			sans: {
				family: "Evil'</style><script>alert(1)</script>",
				variable: '</style><script>',
				weights: '400;700&bad=1',
				display: 'swap;evil=1' as any,
			},
		})
		expect(out).not.toContain('</style><script>')
		expect(out).toContain('--font-sans:')
		expect(out).toContain('wght@100..900')
		expect(out).toContain('&amp;display=swap')
	})
})
