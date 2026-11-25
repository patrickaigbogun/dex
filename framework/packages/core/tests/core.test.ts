import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	createDevServer,
	createProdServer,
	defineApiConfig,
	defineBuildConfig,
	defineConfig,
	defineRouterConfig,
	defineServerConfig,
	loadProjectConfig,
	type DexPlugin,
} from '../src/index'

const tempDirs: string[] = []

async function makeTempDir(prefix = 'dex-core-test-'): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), prefix))
	tempDirs.push(dir)
	return dir
}

afterEach(async () => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop()!
		await rm(dir, { recursive: true, force: true })
	}
})

describe('@dex/core config loader', () => {
	it('loads config/core/index.ts first and normalizes nested fields', async () => {
		const dir = await makeTempDir()
		await mkdir(path.join(dir, 'config', 'core'), { recursive: true })

		// Legacy config also present, should be ignored in favor of config/core/index.ts
		await writeFile(
			path.join(dir, 'dex.config.ts'),
			`export default { port: 4000, pagesDir: 'legacy/pages' }\n`,
			'utf8'
		)

		await writeFile(
			path.join(dir, 'config', 'core', 'index.ts'),
			`export default {
				mode: 'fullstack',
				renderStrategy: 'ssg',
				router: {
					pagesDir: 'app/pages',
					layoutsDir: 'app/layouts',
					outRoutesTs: '.dex/generated/routes.ts',
				},
				server: {
					port: 8123,
					trustProxy: true,
				},
				api: {
					spec: './openapi.yaml',
					prefix: '/v1',
				},
				build: {
					outDir: 'dist',
					minify: true,
				},
				subdomains: { blog: '/blog' },
			}\n`,
			'utf8'
		)

		const cfg = await loadProjectConfig(dir)
		expect(cfg.mode).toBe('fullstack')
		expect(cfg.renderStrategy).toBe('ssg')
		expect(cfg.port).toBe(8123)
		expect(cfg.server?.port).toBe(8123)
		expect(cfg.server?.trustProxy).toBe(true)
		expect(cfg.pagesDir).toBe('app/pages')
		expect(cfg.router?.pagesDir).toBe('app/pages')
		expect(cfg.layoutsDir).toBe('app/layouts')
		expect(cfg.outRoutesTs).toBe('.dex/generated/routes.ts')
		expect(cfg.apiSpec).toBe('./openapi.yaml')
		expect(cfg.api?.spec).toBe('./openapi.yaml')
		expect(cfg.apiPrefix).toBe('/v1')
		expect(cfg.api?.prefix).toBe('/v1')
		expect(cfg.build?.outDir).toBe('dist')
		expect(cfg.subdomains).toEqual({ blog: '/blog' })
	})

	it('falls back to legacy dex.config.ts when config/core is absent', async () => {
		const dir = await makeTempDir()
		await writeFile(
			path.join(dir, 'dex.config.ts'),
			`export default {
				port: 7999,
				renderStrategy: 'spa',
				pagesDir: 'web/pages',
				apiPrefix: '/api',
			}\n`,
			'utf8'
		)

		const cfg = await loadProjectConfig(dir)
		expect(cfg.port).toBe(7999)
		expect(cfg.server?.port).toBe(7999)
		expect(cfg.renderStrategy).toBe('spa')
		expect(cfg.pagesDir).toBe('web/pages')
		expect(cfg.router?.pagesDir).toBe('web/pages')
		expect(cfg.apiPrefix).toBe('/api')
		expect(cfg.api?.prefix).toBe('/api')
	})

	it('provides typed define* config helpers', () => {
		const router = defineRouterConfig({ pagesDir: 'web/pages' })
		const server = defineServerConfig({ port: 7990 })
		const api = defineApiConfig({ prefix: '/api' })
		const build = defineBuildConfig({ minify: true })
		const full = defineConfig({ router, server, api, build })

		expect(full.router?.pagesDir).toBe('web/pages')
		expect(full.server?.port).toBe(7990)
		expect(full.api?.prefix).toBe('/api')
		expect(full.build?.minify).toBe(true)
	})
})

describe('@dex/core server composition & plugins', () => {
	it('runs createDevServer in API-only mode (no web/ dir)', async () => {
		const dir = await makeTempDir()
		await mkdir(path.join(dir, 'routes', 'api'), { recursive: true })

		const elysiaPath = require.resolve('elysia')
		await writeFile(
			path.join(dir, 'routes', 'api', 'index.ts'),
			`import { Elysia } from ${JSON.stringify(elysiaPath)}
export const apiRoutes = () => new Elysia().get('/health', () => ({ ok: true }))
`,
			'utf8'
		)

		const app = await createDevServer(dir)

		const healthRes = await app.handle(new Request('http://localhost/api/health'))
		expect(healthRes.status).toBe(200)
		expect(await healthRes.json()).toEqual({ ok: true })

		const rootRes = await app.handle(new Request('http://localhost/', { headers: { accept: 'text/html' } }))
		expect(rootRes.status).toBe(404)
	})

	it('runs createDevServer in frontend-only mode (no routes/api/)', async () => {
		const dir = await makeTempDir()
		await mkdir(path.join(dir, 'web', 'public'), { recursive: true })
		await writeFile(
			path.join(dir, 'web', 'public', 'index.html'),
			'<!DOCTYPE html><html><head><title>Frontend</title></head><body><div id="root"></div></body></html>',
			'utf8'
		)

		const app = await createDevServer(dir)

		const rootRes = await app.handle(new Request('http://localhost/', { headers: { accept: 'text/html' } }))
		expect(rootRes.status).toBe(200)
		const html = await rootRes.text()
		expect(html).toContain('<div id="root"></div>')

		const apiRes = await app.handle(new Request('http://localhost/api/health'))
		expect(apiRes.status).toBe(404)
	})

	it('executes DexPlugin onServer hook to mount custom routes', async () => {
		const dir = await makeTempDir()
		await mkdir(path.join(dir, 'config', 'core'), { recursive: true })

		const plugin: DexPlugin = {
			name: 'custom-metrics',
			onServer: (app, ctx) => {
				return app.get('/__metrics', () => ({ mode: ctx.mode, ok: true }))
			},
		}
		expect(plugin.name).toBe('custom-metrics')

		await writeFile(
			path.join(dir, 'config', 'core', 'index.ts'),
			`export default {
				plugins: [
					{
						name: 'custom-metrics',
						onServer: (app: any, ctx: { rootDir: string; mode: 'dev' | 'prod' }) => {
							return app.get('/__metrics', () => ({ mode: ctx.mode, rootDir: ctx.rootDir }))
						},
					},
				],
			}\n`,
			'utf8'
		)

		const devApp = await createDevServer(dir)
		const devMetrics = await devApp.handle(new Request('http://localhost/__metrics'))
		expect(devMetrics.status).toBe(200)
		expect(await devMetrics.json()).toEqual({ mode: 'dev', rootDir: dir })

		const prodApp = await createProdServer(dir)
		const prodMetrics = await prodApp.handle(new Request('http://localhost/__metrics'))
		expect(prodMetrics.status).toBe(200)
		expect(await prodMetrics.json()).toEqual({ mode: 'prod', rootDir: dir })
	})
})
