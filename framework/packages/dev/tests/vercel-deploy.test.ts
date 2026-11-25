import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { dexBuildVercel, dexPrepareProvider } from '../src/deploy'

const REPO_ROOT = path.resolve(import.meta.dir, '../../../..')
const STARTER_DIR = path.join(REPO_ROOT, 'templates', 'starter')
const FRAMEWORK_PACKAGES_DIR = path.join(REPO_ROOT, 'framework', 'packages')

describe('Vercel Build Output API v3 adapter', () => {
	test(
		'dexBuildVercel builds templates/starter into valid .vercel/output',
		async () => {
			const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dex-vercel-deploy-'))
			try {
				await cp(STARTER_DIR, tmpDir, {
					recursive: true,
					filter: (src) => {
						const rel = path.relative(STARTER_DIR, src)
						if (!rel) return true
						const top = rel.split(path.sep)[0]
						return top !== 'node_modules' && top !== 'build'
					},
				})

				// Ensure all workspace packages exist in tmpDir/packages/
				const packagesDir = path.join(tmpDir, 'packages')
				await mkdir(packagesDir, { recursive: true })
				for (const pkgName of ['core', 'router', 'server', 'pie', 'dev', 'validation']) {
					const dstPkg = path.join(packagesDir, pkgName)
					if (!existsSync(dstPkg)) {
						const srcPkg = path.join(FRAMEWORK_PACKAGES_DIR, pkgName)
						await cp(srcPkg, dstPkg, {
							recursive: true,
							filter: (src) => {
								const rel = path.relative(srcPkg, src)
								if (!rel) return true
								const top = rel.split(path.sep)[0]
								return top !== 'node_modules' && top !== 'tests'
							},
						})
					}
				}

				const installProc = Bun.spawn(['bun', 'install', '--no-progress'], {
					cwd: tmpDir,
					stdout: 'pipe',
					stderr: 'pipe',
				})
				const installCode = await installProc.exited
				if (installCode !== 0) {
					const stderr = await new Response(installProc.stderr).text()
					throw new Error(`bun install failed (${installCode}): ${stderr}`)
				}

				const { outputDir, config } = await dexBuildVercel({ rootDir: tmpDir })

				// 1. config.json assertions
				const configPath = path.join(outputDir, 'config.json')
				expect(existsSync(configPath)).toBe(true)
				const parsedConfig = JSON.parse(await readFile(configPath, 'utf8'))
				expect(parsedConfig.version).toBe(3)
				expect(config.version).toBe(3)

				const routes = parsedConfig.routes as Array<Record<string, any>>
				const assetsIdx = routes.findIndex((r) => r.src === '/assets/(.*)')
				const devIdx = routes.findIndex((r) => r.src === '/__dev/(.*)' && r.status === 404)
				const apiIdx = routes.findIndex((r) => r.src === '/api/(.*)' && r.dest === '/api')
				const fsIdx = routes.findIndex((r) => r.handle === 'filesystem')
				const spaIdx = routes.findIndex((r) => r.src === '/(.*)' && r.dest === '/index.html')

				expect(assetsIdx).toBeGreaterThanOrEqual(0)
				expect(devIdx).toBeGreaterThan(assetsIdx)
				expect(apiIdx).toBeGreaterThan(devIdx)
				expect(fsIdx).toBeGreaterThan(apiIdx)
				expect(spaIdx).toBeGreaterThan(fsIdx)

				// 2. static HTML and cache-busting assertions
				const indexHtmlPath = path.join(outputDir, 'static', 'index.html')
				expect(existsSync(indexHtmlPath)).toBe(true)
				const indexHtml = await readFile(indexHtmlPath, 'utf8')
				expect(indexHtml).toMatch(/\/assets\/client\.js\?v=[a-f0-9]+/)
				expect(indexHtml).toMatch(/\/assets\/styles\.css\?v=[a-f0-9]+/)
				expect(indexHtml).not.toContain('/__dev/reload')

				// 3. client bundle & ESM chunks assertions
				const clientJsPath = path.join(outputDir, 'static', 'assets', 'client.js')
				expect(existsSync(clientJsPath)).toBe(true)
				const chunksDir = path.join(outputDir, 'static', 'assets', 'chunks')
				expect(existsSync(chunksDir)).toBe(true)
				const chunkFiles = await readdir(chunksDir)
				expect(chunkFiles.some((f) => f.endsWith('.js'))).toBe(true)

				// 4. serverless function metadata & bundle assertions
				const vcConfigPath = path.join(outputDir, 'functions', 'api.func', '.vc-config.json')
				const funcPkgPath = path.join(outputDir, 'functions', 'api.func', 'package.json')
				const funcEntryPath = path.join(outputDir, 'functions', 'api.func', 'index.mjs')
				expect(existsSync(vcConfigPath)).toBe(true)
				expect(existsSync(funcPkgPath)).toBe(true)
				expect(existsSync(funcEntryPath)).toBe(true)

				const vcConfig = JSON.parse(await readFile(vcConfigPath, 'utf8'))
				expect(vcConfig.runtime).toBe('nodejs20.x')
				expect(vcConfig.handler).toBe('index.mjs')
				expect(vcConfig.launcherType).toBe('Nodejs')
				expect(vcConfig.shouldAddHelpers).toBe(true)

				// 5. Dynamic import & invoke API handler
				const funcMod = await import(pathToFileURL(funcEntryPath).href + `?t=${Date.now()}`)
				expect(typeof funcMod.fetch).toBe('function')
				expect(typeof funcMod.default).toBe('object')
				expect(typeof funcMod.default?.fetch).toBe('function')

				const res = await funcMod.default.fetch(new Request('http://localhost/api/v1/health'))
				expect(res.status).toBe(200)
				const body = await res.json()
				expect(body).toEqual({ ok: true })

				const resNamed = await funcMod.fetch(new Request('http://localhost/api/v1/health'))
				expect(resNamed.status).toBe(200)
				expect(await resNamed.json()).toEqual({ ok: true })
			} finally {
				await rm(tmpDir, { recursive: true, force: true })
			}
		},
		120_000
	)

	test('dexPrepareProvider generates config files and .env.example for non-vercel providers', async () => {
		const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dex-providers-test-'))
		try {
			await writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: '@acme/my-dex-app' }), 'utf8')

			const netlifyRes = await dexPrepareProvider({ rootDir: tmpDir, provider: 'netlify' })
			expect(netlifyRes.filesWritten).toContain('netlify.toml')
			expect(netlifyRes.filesWritten).toContain('.env.example')
			expect(await readFile(path.join(tmpDir, 'netlify.toml'), 'utf8')).toContain('/.netlify/functions/api/:splat')

			const cfRes = await dexPrepareProvider({ rootDir: tmpDir, provider: 'cloudflare' })
			expect(cfRes.filesWritten).toContain('wrangler.toml')
			expect(cfRes.filesWritten).toContain('build/.assetsignore')
			const wrangler = await readFile(path.join(tmpDir, 'wrangler.toml'), 'utf8')
			expect(wrangler).toContain('name = "my-dex-app"')
			expect(wrangler).toContain('directory = "build"')
			const assetsIgnore = await readFile(path.join(tmpDir, 'build', '.assetsignore'), 'utf8')
			expect(assetsIgnore).toContain('server')
			expect(assetsIgnore).toContain('server.exe')
			expect(assetsIgnore).toContain('__ssg')

			const railwayRes = await dexPrepareProvider({ rootDir: tmpDir, provider: 'railway' })
			expect(railwayRes.filesWritten).toContain('railway.toml')
			expect(await readFile(path.join(tmpDir, 'railway.toml'), 'utf8')).toContain('healthcheckPath = "/api/v1/health"')

			const renderRes = await dexPrepareProvider({ rootDir: tmpDir, provider: 'render' })
			expect(renderRes.filesWritten).toContain('render.yaml')
			expect(await readFile(path.join(tmpDir, 'render.yaml'), 'utf8')).toContain('healthCheckPath: /api/v1/health')

			const dockerRes = await dexPrepareProvider({ rootDir: tmpDir, provider: 'docker' })
			expect(dockerRes.filesWritten).toEqual(['Dockerfile', 'docker-compose.yml', '.dockerignore'])
			const dockerfile = await readFile(path.join(tmpDir, 'Dockerfile'), 'utf8')
			expect(dockerfile).toContain('RUN dex build')
			expect(dockerfile).toContain('CMD ["dex", "start", "-p"]')
			expect(dockerfile).toContain('http://127.0.0.1:7990/api/v1/health')
			const dockerignore = await readFile(path.join(tmpDir, '.dockerignore'), 'utf8')
			expect(dockerignore).toContain('*.sqlite*')
			expect(dockerignore).toContain('.dex/')
		} finally {
			await rm(tmpDir, { recursive: true, force: true })
		}
	})

	test('dexBuildVercel rejects outDir equal to or escaping rootDir', async () => {
		const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dex-vercel-outdir-'))
		try {
			await expect(dexBuildVercel({ rootDir: tmpDir, outDir: '.' })).rejects.toThrow()
			await expect(dexBuildVercel({ rootDir: tmpDir, outDir: '../outside' })).rejects.toThrow()
		} finally {
			await rm(tmpDir, { recursive: true, force: true })
		}
	})
})
