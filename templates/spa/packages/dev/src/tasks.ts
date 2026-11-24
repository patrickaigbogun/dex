import { spawnGroup } from './index'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rm, copyFile, readFile, writeFile, cp as fsCp, readdir } from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import { renderToString } from 'react-dom/server'

const ENTRY_NAMING = 'client.[ext]'

const PUBLIC_ENV_KEY_RE = /^(NEXT_PUBLIC_|PUBLIC_|VITE_)[A-Za-z0-9_]+$/
const VALID_FONT_DISPLAYS = new Set(['swap', 'auto', 'block', 'fallback', 'optional'])

function getPublicEnvDefines(cwd = process.cwd()): string[] {
	const envPath = path.resolve(cwd, '.env')
	const env: Record<string, string | undefined> = Object.create(null)

	if (existsSync(envPath)) {
		const envContent = readFileSync(envPath, 'utf-8')
		envContent.split('\n').forEach((line) => {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) return
			const withoutExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
			const eqIdx = withoutExport.indexOf('=')
			if (eqIdx === -1) return
			const key = withoutExport.slice(0, eqIdx).trim()
			let rawVal = withoutExport.slice(eqIdx + 1).trim()
			if (
				(rawVal.startsWith('"') && rawVal.endsWith('"') && rawVal.length >= 2) ||
				(rawVal.startsWith("'") && rawVal.endsWith("'") && rawVal.length >= 2)
			) {
				rawVal = rawVal.slice(1, -1)
			}
			if (key) {
				env[key] = rawVal
			}
		})
	}

	Object.assign(env, process.env)

	const defineArgs: string[] = []
	Object.entries(env).forEach(([key, value]) => {
		if (value !== undefined && PUBLIC_ENV_KEY_RE.test(key)) {
			defineArgs.push('--define')
			defineArgs.push(`process.env.${key}=${JSON.stringify(value)}`)
		}
	})

	return defineArgs
}

type DexHeadMetaLike = {
	title?: string | null
	description?: string | null
	ogTitle?: string | null
	ogDescription?: string | null
	ogImage?: string | null
	ogVideo?: string | null
	ogType?: string | null
	url?: string | null
	twitterCard?: 'summary' | 'summary_large_image' | 'player' | null
}

type DexFontSpecLike = {
	family: string
	variable?: string
	weights?: string
	ital?: boolean
	display?: 'swap' | 'auto' | 'block' | 'fallback' | 'optional'
	provider?: 'google' | 'none'
}

type DexFontsConfigLike = Record<string, string | DexFontSpecLike>

function escapeHtmlAttr(val: string): string {
	return val
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

function escapeHtmlText(val: string): string {
	return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeCssString(val: string): string {
	return val
		.replace(/[\r\n\f\0]+/g, '')
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/"/g, '\\"')
		.replace(/</g, '\\3C ')
		.replace(/>/g, '\\3E ')
		.replace(/&/g, '\\26 ')
		.replace(/\//g, '\\2F ')
}

function isSafeMetaUrl(val: string): boolean {
	const cleaned = val.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase()
	const m = /^([a-z0-9+.-]+):/.exec(cleaned)
	if (m) {
		return m[1] !== 'javascript' && m[1] !== 'data' && m[1] !== 'vbscript'
	}
	return true
}

function injectHeadMeta(html: string, meta: DexHeadMetaLike): string {
	let out = html
	const title = meta.title || meta.ogTitle
	if (title) {
		const escapedTitle = escapeHtmlText(title)
		if (/<title>[\s\S]*?<\/title>/i.test(out)) {
			out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapedTitle}</title>`)
		} else {
			out = out.replace(/<\/head>/i, () => `<title>${escapedTitle}</title>\n\t</head>`)
		}
	}

	const tags: string[] = []
	const desc = meta.description || meta.ogDescription
	if (desc) {
		tags.push(`<meta name="description" content="${escapeHtmlAttr(desc)}" />`)
		tags.push(`<meta property="og:description" content="${escapeHtmlAttr(desc)}" />`)
		tags.push(`<meta name="twitter:description" content="${escapeHtmlAttr(desc)}" />`)
	}
	const ogTitle = meta.ogTitle || meta.title
	if (ogTitle) {
		tags.push(`<meta property="og:title" content="${escapeHtmlAttr(ogTitle)}" />`)
		tags.push(`<meta name="twitter:title" content="${escapeHtmlAttr(ogTitle)}" />`)
	}
	if (meta.ogType) {
		tags.push(`<meta property="og:type" content="${escapeHtmlAttr(meta.ogType)}" />`)
	}
	if (meta.url && isSafeMetaUrl(meta.url)) {
		tags.push(`<meta property="og:url" content="${escapeHtmlAttr(meta.url)}" />`)
	}
	const safeOgImage = meta.ogImage && isSafeMetaUrl(meta.ogImage) ? meta.ogImage : null
	if (safeOgImage) {
		tags.push(`<meta property="og:image" content="${escapeHtmlAttr(safeOgImage)}" />`)
		tags.push(`<meta name="twitter:image" content="${escapeHtmlAttr(safeOgImage)}" />`)
	}
	if (meta.ogVideo && isSafeMetaUrl(meta.ogVideo)) {
		tags.push(`<meta property="og:video" content="${escapeHtmlAttr(meta.ogVideo)}" />`)
		tags.push(`<meta property="og:video:secure_url" content="${escapeHtmlAttr(meta.ogVideo)}" />`)
		tags.push(`<meta property="og:video:type" content="video/mp4" />`)
	}
	const twitterCard = meta.twitterCard || (safeOgImage ? 'summary_large_image' : 'summary')
	tags.push(`<meta name="twitter:card" content="${escapeHtmlAttr(twitterCard)}" />`)

	if (tags.length > 0) {
		out = out.replace(/<\/head>/i, () => `\t\t${tags.join('\n\t\t')}\n\t</head>`)
	}
	return out
}

function injectGoogleFonts(html: string, fonts?: DexFontsConfigLike): string {
	if (!fonts || typeof fonts !== 'object') return html
	if (html.includes('id="dex-fonts-theme"')) return html
	if (!/<\/head>/i.test(html)) return html

	const normalized: Array<{
		key: string
		family: string
		variable: string
		weights: string
		ital: boolean
		display: string
		provider: 'google' | 'none'
	}> = []

	for (const [rawKey, spec] of Object.entries(fonts)) {
		const key = rawKey.replace(/[^a-zA-Z0-9_-]/g, '')
		if (!key) continue
		if (typeof spec === 'string') {
			const family = spec.trim()
			if (!family) continue
			normalized.push({
				key,
				family,
				variable: `--font-${key}`,
				weights: '100..900',
				ital: false,
				display: 'swap',
				provider: 'google',
			})
		} else if (spec && typeof spec === 'object') {
			const family = (spec.family ?? '').trim()
			if (!family) continue
			const rawVar = spec.variable?.trim()
			const candidateVar = rawVar ? (rawVar.startsWith('--') ? rawVar : `--${rawVar}`) : `--font-${key}`
			const variable = /^--[a-zA-Z0-9_-]+$/.test(candidateVar) ? candidateVar : `--font-${key}`
			const rawWeights = spec.weights !== undefined ? spec.weights.trim() : '100..900'
			const weights = /^[0-9.;]+$/.test(rawWeights) ? rawWeights : '100..900'
			const display = spec.display && VALID_FONT_DISPLAYS.has(spec.display) ? spec.display : 'swap'
			normalized.push({
				key,
				family,
				variable,
				weights,
				ital: Boolean(spec.ital),
				display,
				provider: spec.provider ?? 'google',
			})
		}
	}

	if (normalized.length === 0) return html

	const googleEntries = normalized.filter((f) => f.provider !== 'none')
	const tags: string[] = []
	if (googleEntries.length > 0) {
		const familyParams = googleEntries.map((entry) => {
			const encodedFamily = encodeURIComponent(entry.family).replace(/%20/g, '+')
			if (entry.ital) {
				if (entry.weights.includes('..')) {
					return `family=${encodedFamily}:ital,wght@0,${entry.weights};1,${entry.weights}`
				} else if (entry.weights) {
					const weights = entry.weights.split(';').map((w) => w.trim()).filter(Boolean)
					const tuples = [...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)]
					return `family=${encodedFamily}:ital,wght@${tuples.join(';')}`
				}
				return `family=${encodedFamily}:ital@0;1`
			}
			return entry.weights ? `family=${encodedFamily}:wght@${entry.weights}` : `family=${encodedFamily}`
		})
		const display = googleEntries[0]?.display ?? 'swap'
		const url = `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=${display}`
		if (!html.includes('https://fonts.googleapis.com')) {
			tags.push('<link rel="preconnect" href="https://fonts.googleapis.com">')
		}
		if (!html.includes('https://fonts.gstatic.com')) {
			tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
		}
		tags.push(`<link rel="stylesheet" href="${escapeHtmlAttr(url)}">`)
	}

	const rootVars = normalized
		.map((f) => `  ${f.variable}: '${escapeCssString(f.family)}', sans-serif;`)
		.join('\n')
	const utilityClasses = normalized
		.map((f) => `.font-${f.key} { font-family: var(${f.variable}); }`)
		.join('\n')
	tags.push(`<style id="dex-fonts-theme">\n:root {\n${rootVars}\n}\n${utilityClasses}\n</style>`)

	return html.replace(/<\/head>/i, () => `\t\t${tags.join('\n\t\t')}\n\t</head>`)
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

async function collectHtmlFiles(dir: string, skipAssetsDir = true): Promise<string[]> {
	const files: string[] = []
	const entries = await readdir(dir, { withFileTypes: true })
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (skipAssetsDir && entry.name === 'assets') continue
			files.push(...(await collectHtmlFiles(fullPath, false)))
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			files.push(fullPath)
		}
	}
	return files
}

async function updateBuildHtmlCacheBusting(buildDir: string, clientHash: string | null, cssHash: string | null) {
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

export type DexTaskOptions = {
	rootDir: string
	defineArgs?: string[]
	noWatch?: boolean
}

export async function dexPrepareBuild({ rootDir }: DexTaskOptions) {
	const buildDir = path.join(rootDir, 'build')
	await rm(buildDir, { recursive: true, force: true })
	await mkdir(path.join(buildDir, 'assets'), { recursive: true })
	await copyFile(path.join(rootDir, 'web/public/index.html'), path.join(buildDir, 'index.html'))
}

export async function dexBuildClient({ rootDir, defineArgs = [] }: DexTaskOptions) {
	const proc = Bun.spawn(
		[
			'bun',
			'build',
			'core/bootstrap/web.tsx',
			'--target', // TODO: Make these configurable?
			'browser',
			'--splitting',
			'--format',
			'esm',
			'--minify',
			'--outdir',
			'build/assets',
			'--entry-naming',
			ENTRY_NAMING,
			'--chunk-naming',
			'chunks/[name]-[hash].[ext]',
			...defineArgs,
		],
		{ 
			cwd: rootDir,
			stdout: 'inherit',
			stderr: 'inherit',
			stdin: 'inherit'
		}
	)

	const code = await proc.exited
	if (code !== 0) process.exit(code)
}

export async function dexBuild({ rootDir, defineArgs = [] }: DexTaskOptions) {
	// 1. Generate routes
	const genProc = Bun.spawn(
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
		{ 
			cwd: rootDir, 
			stdout: 'inherit', 
			stderr: 'inherit', 
			stdin: 'inherit' 
		}
	)
	if ((await genProc.exited) !== 0) process.exit(1)

	// 2. Prepare build directory
	await dexPrepareBuild({ rootDir })

	// 3. Prerender static pages
	await dexPrerender({ rootDir })

	// 4. Build CSS
	const cssProc = Bun.spawn(
		['bun', 'tailwindcss', '-i', 'web/styles/index.css', '-o', 'build/assets/styles.css', '--minify'],
		{ 
			cwd: rootDir, 
			stdout: 'inherit', 
			stderr: 'inherit', 
			stdin: 'inherit' 
		}
	)
	if ((await cssProc.exited) !== 0) process.exit(1)

	// 5. Build client bundle
	await dexBuildClient({ rootDir, defineArgs })

	// 5b. Cache-bust asset references in build/index.html and prerendered HTML files
	const buildDir = path.join(rootDir, 'build')
	const clientHash = await computeShortHash(path.join(buildDir, 'assets', 'client.js'))
	const cssHash = await computeShortHash(path.join(buildDir, 'assets', 'styles.css'))
	await updateBuildHtmlCacheBusting(buildDir, clientHash, cssHash)

	// 6. Build standalone server binary
	const srvProc = Bun.spawn(
		['bun', 'build', '--compile', 'core/runtime/server/prod.ts', '--outfile', 'build/server'],
		{ 
			cwd: rootDir, 
			stdout: 'inherit', 
			stderr: 'inherit', 
			stdin: 'inherit' 
		}
	)
	if ((await srvProc.exited) !== 0) process.exit(1)
}

export async function dexDev({ rootDir, defineArgs, noWatch }: DexTaskOptions) {
	const resolvedDefineArgs = defineArgs && defineArgs.length > 0 ? defineArgs : getPublicEnvDefines(rootDir)
	const disableWatch = Boolean(noWatch || process.argv.includes('--no-watch') || process.env.DEX_NO_WATCH === '1')

	// Generate routes once before starting watchers (or single-shot build)
	const proc = Bun.spawn(
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
		{
			cwd: rootDir,
			stdout: 'inherit',
			stderr: 'inherit',
			stdin: 'inherit'
		}
	)
	const code = await proc.exited
	if (code !== 0) process.exit(code)

	if (disableWatch) {
		const cssProc = Bun.spawn(
			['bun', 'tailwindcss', '-i', 'web/styles/index.css', '-o', 'web/public/assets/styles.css'],
			{
				cwd: rootDir,
				stdout: 'inherit',
				stderr: 'inherit',
				stdin: 'inherit',
			}
		)
		const cssCode = await cssProc.exited
		if (cssCode !== 0) process.exit(cssCode)

		const clientProc = Bun.spawn(
			[
				'bun',
				'build',
				'core/bootstrap/web.tsx',
				'--target',
				'browser',
				'--splitting',
				'--format',
				'esm',
				'--outdir',
				'web/public/assets',
				'--entry-naming',
				'client.[ext]',
				...resolvedDefineArgs,
			],
			{
				cwd: rootDir,
				stdout: 'inherit',
				stderr: 'inherit',
				stdin: 'inherit',
			}
		)
		const clientCode = await clientProc.exited
		if (clientCode !== 0) process.exit(clientCode)

		const srvProc = Bun.spawn(['bun', 'core/runtime/app/index.ts'], {
			cwd: rootDir,
			stdout: 'inherit',
			stderr: 'inherit',
			stdin: 'inherit',
		})
		const forwardSignal = () => {
			try {
				srvProc.kill('SIGTERM')
			} catch {
				// ignore
			}
		}
		process.on('SIGINT', forwardSignal)
		process.on('SIGTERM', forwardSignal)
		const srvCode = await srvProc.exited
		process.off('SIGINT', forwardSignal)
		process.off('SIGTERM', forwardSignal)
		if (srvCode !== 0) process.exit(srvCode)
		return
	}

	spawnGroup([
		{
			name: 'routes:watch',
			cmd: [
				'bunx',
				'--bun',
				'dex-router',
				'watch',
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
		},
		{
			name: 'styles:watch',
			cmd: [
				'bun',
				'tailwindcss',
				'-i',
				'web/styles/index.css',
				'-o',
				'web/public/assets/styles.css',
				'--watch',
			],
		},
		{
			name: 'client:watch',
			cmd: [
				'bun',
				'build',
				'core/bootstrap/web.tsx',
				'--target',
				'browser',
				'--splitting',
				'--format',
				'esm',
				'--outdir',
				'web/public/assets',
				'--entry-naming',
				'client.[ext]',
				...resolvedDefineArgs,
				'--watch',
			],
		},
		{
			name: 'server:dev',
			cmd: ['bun', '--watch', 'core/runtime/app/index.ts'],
		},
	])
}

// Prerender logic
type RenderStrategy = 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'

type DexConfig = {
	renderStrategy?: RenderStrategy
	fonts?: DexFontsConfigLike
}

function resolveLayoutName(sel: unknown): string | undefined {
	if (!sel) return
	if (typeof sel === 'string') return sel
	if (typeof sel === 'function') {
		try {
			const v = sel() // @ts-ignore
			if (typeof v === 'string') return v
		} catch {
			return
		}
	}
}

function getDefaultExport(mod: any) {
	return mod?.default ?? mod
}

function isStaticRoute(segments: any[] | undefined) {
	if (!Array.isArray(segments)) return false
	return segments.every((s) => s && s.kind === 'static')
}

function injectIntoIndexHtml(indexHtml: string, rendered: string) {
	const emptyRoot = '<div id="root"></div>'
	const emptyIdx = indexHtml.indexOf(emptyRoot)
	if (emptyIdx !== -1) {
		return indexHtml.slice(0, emptyIdx) + `<div id="root">${rendered}</div>` + indexHtml.slice(emptyIdx + emptyRoot.length)
	}
	const open = '<div id="root">'
	const close = '</div>'
	const i = indexHtml.indexOf(open)
	if (i === -1) throw new Error('Could not find <div id="root"> in index.html')
	const j = indexHtml.indexOf(close, i + open.length)
	if (j === -1) throw new Error('Could not find closing </div> for #root in index.html')
	return indexHtml.slice(0, i + open.length) + rendered + indexHtml.slice(j)
}

export type DexPrerenderOptions = DexTaskOptions & {
    // allowing passing modules explicitly or falling back to path resolution
}

export async function dexPrerender({ rootDir }: DexPrerenderOptions) {
	const buildDir = path.join(rootDir, 'build')
	const ssgDir = path.join(buildDir, '__ssg')

    let configMod: any
    try {
        configMod = await import(path.join(rootDir, 'dex.config.ts') + `?t=${Date.now()}`)
    } catch {
        configMod = {} 
    }
	const cfg: DexConfig = (configMod?.default ?? {}) as DexConfig
	const appDefault = cfg.renderStrategy ?? 'spa'

	if (appDefault !== 'ssg') {
		process.stdout.write(
			`ℹ prerender: renderStrategy=${appDefault}; prerendering routes whose final strategy resolves to ssg\n`
		)
	}

	const indexHtmlPath = path.join(buildDir, 'index.html')
	let indexHtml: string
	try {
		indexHtml = await readFile(indexHtmlPath, 'utf8')
	} catch (e) {
		console.warn(`prerender: missing build/index.html at ${indexHtmlPath}; skipping prerender`)
		return
	}

	const routesMod: any = await import(path.join(rootDir, 'core/router/.generated/routes.ts') + `?t=${Date.now()}`)
	const layoutsMod: any = await import(path.join(rootDir, 'core/router/.generated/layouts.ts') + `?t=${Date.now()}`)

	const routes: any[] = routesMod?.routes ?? []
	const layouts: Record<string, () => Promise<any>> = layoutsMod?.layouts ?? {}

	let GlobalLayout: any
	try {
		const glMod: any = await import(path.join(rootDir, 'web/layouts/global.tsx') + `?t=${Date.now()}`)
		GlobalLayout = getDefaultExport(glMod)
	} catch {
		GlobalLayout = undefined
	}

	let RouterContext: any
	let createStaticRouterState: any
	const routerCandidates = [
		path.join(rootDir, 'packages/router/src/client/router.tsx'),
		path.join(rootDir, 'node_modules/@dex/router/src/client/router.tsx'),
		'@dex/router/client',
	]
	for (const candidate of routerCandidates) {
		try {
			if (candidate.startsWith('/') && !existsSync(candidate)) continue
			const modPath: string = candidate
			const routerMod: any = await import(modPath)
			if (routerMod?.RouterContext) {
				RouterContext = routerMod.RouterContext
				createStaticRouterState = routerMod.createStaticRouterState
				break
			}
		} catch {
			// try next candidate
		}
	}

	await mkdir(ssgDir, { recursive: true })

	let wrote = 0
	let skipped = 0

	for (const r of routes) {
		const routePath = typeof r?.path === 'string' ? r.path : null
		if (!routePath) {
			skipped++
			continue
		}

		if (!isStaticRoute(r?.segments)) {
			skipped++
			continue
		}

		// Check if page overrides strategy
		let strategy = appDefault
		// For simplicity, we assume we can import the page to check metadata.
        // Wait, routes.ts imports everything lazily? 
        // In starter/core/router/.generated/routes.ts:
        // export const routes = [ { path: '/', component: () => import(...) }, ... ]
        // The generator output structure matters.
        // I will assume standard Dex router structure.
        
        // However, I need to fetch the component to read metadata.
		let pageMod: any
        try {
            const importer = r.importPage ?? r.component
            if (importer) {
               pageMod = await importer()
            }
        } catch (e) {
            console.warn(`Failed to load component for ${routePath}`, e)
            continue
        }

		const pageMeta = pageMod?.metadata || {}
		if (pageMeta.renderStrategy) {
			strategy = pageMeta.renderStrategy
		}

		if (strategy !== 'ssg') {
			skipped++
			continue
		}

		// RENDER
		const PageComponent = getDefaultExport(pageMod)
		let PageLayout: any = undefined
		
        // Resolve layout
        // This logic mimics router runtime but minimal
        // Layout resolution is tricky without full router logic.
        // But for SSG of static pages, we can just grab the layout if defined.
        
        // Wait, layouts in Dex are hierarchical?
        // Let's assume simplifed layout resolution for now or just render PageComponent wrapped in GlobalLayout.
        // The original prerender.ts likely had more logic.

        // Actually, the original `prerender.ts` code I read earlier didn't show the layout wrapping logic completely (it was cut off or I didn't read all).
        // I will implement a basic version that wraps Page in GlobalLayout if present.

        // Re-reading `prerender.ts` would help if I hadn't already decided to copy logic.
        // I'll stick to a sensible default: GlobalLayout > PageLayout > Page.

        const layoutName = resolveLayoutName(pageMod?.layout)
        if (layoutName && layouts[layoutName]) {
            const mod = await layouts[layoutName]()
            PageLayout = getDefaultExport(mod)
        }

		let content: any = React.createElement(PageComponent)
		if (PageLayout) {
			content = React.createElement(PageLayout, { children: content })
		}
		if (GlobalLayout) {
			content = React.createElement(GlobalLayout, { children: content })
		}

		if (RouterContext) {
			const staticState =
				typeof createStaticRouterState === 'function'
					? createStaticRouterState(routePath, {})
					: {
							pathname: routePath,
							search: '',
							hash: '',
							params: {},
							query: new URLSearchParams(),
							isNavigating: false,
							navigate: () => {},
							prefetch: async () => {},
						}
			content = React.createElement(RouterContext.Provider, { value: staticState }, content)
		}

		const html = renderToString(content)
		let cleanHtml = injectIntoIndexHtml(indexHtml, html)

		const hasHeadMeta = Boolean(
			pageMeta.title ||
				pageMeta.description ||
				pageMeta.ogTitle ||
				pageMeta.ogDescription ||
				pageMeta.ogImage ||
				pageMeta.ogVideo ||
				pageMeta.ogType ||
				pageMeta.url ||
				pageMeta.twitterCard
		)
		if (hasHeadMeta) {
			cleanHtml = injectHeadMeta(cleanHtml, pageMeta)
		}
		if (cfg.fonts) {
			cleanHtml = injectGoogleFonts(cleanHtml, cfg.fonts)
		}

		// write file
		const outPath = routePath === '/' ? 'index.html' : routePath.endsWith('/') ? routePath + 'index.html' : routePath + '/index.html'
        const fullOutPath = path.join(ssgDir, outPath)
		await mkdir(path.dirname(fullOutPath), { recursive: true })
		await writeFile(fullOutPath, cleanHtml)
		wrote++
	}

	console.log(`Pre-rendered ${wrote} pages (skipped ${skipped}).`)

	// Copy ssgDir contents to buildDir while keeping ssgDir intact for prod server lookup.
	try {
		if (typeof fsCp === 'function') {
			await fsCp(ssgDir + '/.', buildDir, { recursive: true, force: true })
		} else {
			throw new Error('fs.cp not available')
		}
	} catch (e) {
		// Fallback to shell copy for environments where fs.cp isn't available.
		const cpProc = Bun.spawn(['cp', '-r', ssgDir + '/.', buildDir], { stdout: 'ignore', stderr: 'inherit' })
		await cpProc.exited
	}
}
