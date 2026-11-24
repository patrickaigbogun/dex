import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { dexBuildClient, dexPrepareBuild, dexPrerender } from '../tasks'

export type VercelBuildOptions = {
	rootDir: string
	defineArgs?: string[]
	outDir?: string
}

export type VercelConfigRoute = {
	src?: string
	dest?: string
	headers?: Record<string, string>
	status?: number
	handle?: string
	continue?: boolean
	has?: Array<{ type: string; value: string }>
}

export type VercelBuildOutputConfig = {
	version: 3
	routes: VercelConfigRoute[]
}

async function runChecked(cmd: string[], cwd: string, label: string): Promise<void> {
	const proc = Bun.spawn(cmd, {
		cwd,
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit',
	})
	const code = await proc.exited
	if (code !== 0) {
		throw new Error(`${label} failed with exit code ${code}`)
	}
}

async function computeShortHash(filePath: string): Promise<string | null> {
	if (!existsSync(filePath)) return null
	const content = await readFile(filePath)
	return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

function applyCacheBustingToHtml(html: string, clientHash: string | null, cssHash: string | null): string {
	let out = html
	if (clientHash) {
		out = out.replace(
			/<script\b([^>]*?)\bsrc=["']\/assets\/client\.js(?:\?v=[^"']*)?["']([^>]*)>/gi,
			(_match, before: string, after: string) => {
				const attrs = `${before}${after}`
				const hasType = /\btype\s*=/i.test(attrs)
				const normalizedBefore = hasType ? before : `${before} type="module"`
				return `<script${normalizedBefore} src="/assets/client.js?v=${clientHash}"${after}>`
			}
		)
	}
	if (cssHash) {
		out = out.replace(
			/\bhref=["']\/assets\/styles\.css(?:\?v=[^"']*)?["']/gi,
			`href="/assets/styles.css?v=${cssHash}"`
		)
	}
	return out
}

async function collectHtmlFiles(dir: string, skipTopDirs = true): Promise<string[]> {
	const files: string[] = []
	const entries = await readdir(dir, { withFileTypes: true })
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (skipTopDirs && (entry.name === 'assets' || entry.name === '__ssg')) continue
			files.push(...(await collectHtmlFiles(fullPath, false)))
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			files.push(fullPath)
		}
	}
	return files
}

async function updateBuildHtmlCacheBusting(buildDir: string, clientHash: string | null, cssHash: string | null): Promise<void> {
	if (!clientHash && !cssHash) return
	const htmlFiles = await collectHtmlFiles(buildDir)
	for (const htmlFile of htmlFiles) {
		const raw = await readFile(htmlFile, 'utf8')
		const updated = applyCacheBustingToHtml(raw, clientHash, cssHash)
		if (updated !== raw) {
			await writeFile(htmlFile, updated, 'utf8')
		}
	}
}

async function loadSubdomainsConfig(rootDir: string): Promise<Record<string, string>> {
	for (const filename of ['dex.config.ts', 'dex.config.js', 'dex.config.mjs', 'dex.config.json']) {
		const cfgPath = path.join(rootDir, filename)
		if (!existsSync(cfgPath)) continue
		try {
			if (filename.endsWith('.json')) {
				const raw = JSON.parse(await readFile(cfgPath, 'utf8'))
				if (raw?.subdomains && typeof raw.subdomains === 'object') {
					return raw.subdomains as Record<string, string>
				}
				return {}
			}
			const mod: any = await import(pathToFileURL(cfgPath).href + `?t=${Date.now()}`)
			const cfg = mod?.default ?? mod?.dexConfig ?? mod
			if (cfg?.subdomains && typeof cfg.subdomains === 'object') {
				return cfg.subdomains as Record<string, string>
			}
			return {}
		} catch {
			return {}
		}
	}
	return {}
}

function hasTailwindInstalled(rootDir: string): boolean {
	return (
		existsSync(path.join(rootDir, 'node_modules', 'tailwindcss')) ||
		existsSync(path.join(rootDir, 'node_modules', '@tailwindcss', 'cli')) ||
		existsSync(path.join(rootDir, 'node_modules', '.bin', 'tailwindcss'))
	)
}

async function copyStaticArtifacts(buildDir: string, staticDir: string): Promise<void> {
	await mkdir(staticDir, { recursive: true })
	const entries = await readdir(buildDir, { withFileTypes: true })
	for (const entry of entries) {
		if (entry.name === '__ssg' || entry.name === 'server' || entry.name === 'server.exe') continue
		const src = path.join(buildDir, entry.name)
		const dest = path.join(staticDir, entry.name)
		await cp(src, dest, { recursive: true, force: true })
	}
}

function hasApiRoutesModule(rootDir: string): boolean {
	return (
		existsSync(path.join(rootDir, 'routes', 'api', 'index.ts')) ||
		existsSync(path.join(rootDir, 'routes', 'api', 'index.js')) ||
		existsSync(path.join(rootDir, 'routes', 'api.ts')) ||
		existsSync(path.join(rootDir, 'routes', 'api.js'))
	)
}

function buildVercelConfig(subdomains: Record<string, string>): VercelBuildOutputConfig {
	const routes: VercelConfigRoute[] = [
		{
			src: '/assets/(.*)',
			headers: { 'cache-control': 'public, max-age=31536000, immutable' },
			continue: true,
		},
	]

	for (const [sub, prefix] of Object.entries(subdomains)) {
		const cleanSub = sub.trim()
		if (!cleanSub || typeof prefix !== 'string' || !prefix.trim()) continue
		const normPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`
		const trimmedPrefix = normPrefix.length > 1 && normPrefix.endsWith('/') ? normPrefix.slice(0, -1) : normPrefix
		const destPrefix = trimmedPrefix === '/' ? '' : trimmedPrefix
		const escapedSub = cleanSub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		routes.push({
			src: '^/(?!assets/|api/)(.*)',
			dest: `${destPrefix}/$1`,
			has: [{ type: 'host', value: `^${escapedSub}\\..*` }],
			continue: true,
		})
	}

	routes.push(
		{ src: '/api/(.*)', dest: '/api' },
		{ handle: 'filesystem' },
		{ src: '/(.*)', dest: '/index.html' }
	)

	return {
		version: 3,
		routes,
	}
}

/**
 * Build a Dex application into Vercel Build Output API v3 format (.vercel/output).
 */
export async function dexBuildVercel(
	opts: VercelBuildOptions
): Promise<{ outputDir: string; config: VercelBuildOutputConfig }> {
	const rootDir = path.resolve(opts.rootDir)
	const defineArgs = opts.defineArgs ?? []
	const outputDir = opts.outDir ? path.resolve(rootDir, opts.outDir) : path.join(rootDir, '.vercel', 'output')

	if (outputDir === rootDir || !outputDir.startsWith(rootDir + path.sep)) {
		throw new Error(`Invalid outDir "${opts.outDir}": output directory must be a subdirectory inside rootDir`)
	}

	// 1. Generate routes
	await runChecked(
		[
			'bunx',
			'--bun',
			'dex-router',
			'generate',
			'--pagesDir',
			'web/pages',
			'--layoutsDir',
			'web/layouts',
			'--outRoutesTs',
			'core/router/.generated/routes.ts',
			'--outRoutesJson',
			'core/router/.generated/manifest.json',
			'--outLayoutsTs',
			'core/router/.generated/layouts.ts',
		],
		rootDir,
		'dex-router generate'
	)

	// 2. Prepare build directory
	await dexPrepareBuild({ rootDir })

	// 3. Prerender static pages
	await dexPrerender({ rootDir })

	// 4. Build CSS if tailwindcss is present
	const stylesInput = path.join(rootDir, 'web', 'styles', 'index.css')
	if (existsSync(stylesInput) && hasTailwindInstalled(rootDir)) {
		await runChecked(
			['bun', 'tailwindcss', '-i', 'web/styles/index.css', '-o', 'build/assets/styles.css', '--minify'],
			rootDir,
			'tailwindcss'
		)
	}

	// 5. Build client ESM bundle
	await dexBuildClient({ rootDir, defineArgs })

	// 6. Content-hash busting on build/index.html and prerendered HTML files
	const buildDir = path.join(rootDir, 'build')
	const clientHash = await computeShortHash(path.join(buildDir, 'assets', 'client.js'))
	const cssHash = await computeShortHash(path.join(buildDir, 'assets', 'styles.css'))
	await updateBuildHtmlCacheBusting(buildDir, clientHash, cssHash)

	// 7. Assemble .vercel/output structure
	if (outputDir === path.resolve(rootDir) || !outputDir.startsWith(path.resolve(rootDir) + path.sep)) {
		throw new Error(`Refusing to remove unsafe outputDir: ${outputDir}`)
	}
	await rm(outputDir, { recursive: true, force: true })
	const staticDir = path.join(outputDir, 'static')
	const funcDir = path.join(outputDir, 'functions', 'api.func')
	await mkdir(staticDir, { recursive: true })
	await mkdir(funcDir, { recursive: true })

	await copyStaticArtifacts(buildDir, staticDir)

	// 8. Bundle Elysia API routes into serverless function
	const tempEntryPath = path.join(rootDir, `.dex-vercel-api-${process.pid}-${Date.now()}.ts`)
	const entrySource = hasApiRoutesModule(rootDir)
		? [
				`import { Elysia } from 'elysia'`,
				`import { apiRoutes } from './routes/api'`,
				``,
				`const app = new Elysia().group('/api', (api) => api.use(apiRoutes()))`,
				``,
				`export const fetch = (req: Request) => app.fetch(req)`,
				`export default { fetch }`,
				``,
			].join('\n')
		: [
				`import { Elysia } from 'elysia'`,
				``,
				`const app = new Elysia()`,
				`\t.get('/api/v1/health', () => ({ ok: true }))`,
				`\t.get('/api/health', () => ({ ok: true }))`,
				``,
				`export const fetch = (req: Request) => app.fetch(req)`,
				`export default { fetch }`,
				``,
			].join('\n')

	await writeFile(tempEntryPath, entrySource, 'utf8')
	try {
		await runChecked(
			[
				'bun',
				'build',
				tempEntryPath,
				'--target',
				'node',
				'--format',
				'esm',
				'--outfile',
				path.join(funcDir, 'index.mjs'),
			],
			rootDir,
			'bun build api.func'
		)
	} finally {
		await rm(tempEntryPath, { force: true })
	}

	await writeFile(
		path.join(funcDir, '.vc-config.json'),
		JSON.stringify(
			{
				runtime: 'nodejs20.x',
				handler: 'index.mjs',
				launcherType: 'Nodejs',
				shouldAddHelpers: true,
			},
			null,
			2
		) + '\n',
		'utf8'
	)

	await writeFile(
		path.join(funcDir, 'package.json'),
		JSON.stringify({ type: 'module' }, null, 2) + '\n',
		'utf8'
	)

	// 9. Write .vercel/output/config.json
	const subdomains = await loadSubdomainsConfig(rootDir)
	const config = buildVercelConfig(subdomains)
	await writeFile(path.join(outputDir, 'config.json'), JSON.stringify(config, null, 2) + '\n', 'utf8')

	return { outputDir, config }
}
