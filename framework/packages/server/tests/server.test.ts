import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { dexAssetsRoute, dexSpaFallback } from '../src/index'
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
		})
	} finally {
		// cleanup after tests run
	}
})

describe('dexSpaFallback', () => {
	const tmpDir = path.join(os.tmpdir(), `dex-test-spa-${Date.now()}`)
	mkdirSync(tmpDir, { recursive: true })
	const indexPath = path.join(tmpDir, 'index.html')
	writeFileSync(indexPath, '<!DOCTYPE html><html><body><div id="root"></div></body></html>')

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
})
