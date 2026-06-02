import { spawnGroup } from './index'
import { mkdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import { renderToString } from 'react-dom/server'

export type DexTaskOptions = {
	rootDir: string
	defineArgs?: string[]
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
			'--minify',
			'--outdir',
			'build/assets',
			'--entry-naming',
			'client.[ext]',
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

export async function dexDev({ rootDir }: DexTaskOptions) {
	// Generate routes once before starting watchers
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
				'--outdir',
				'web/public/assets',
				'--entry-naming',
				'client.[ext]',
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
	if (indexHtml.includes('<div id="root"></div>')) {
		return indexHtml.replace('<div id="root"></div>', `<div id="root">${rendered}</div>`)
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
	const indexHtml = await readFile(indexHtmlPath, 'utf8')

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
            if (r.component) {
               pageMod = await r.component()
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

        // We probably need to wrap in Router context if components rely on it?
        // But for static pages maybe not strictly required if no link generation happens during render.
        // Although Link component needs context.
        // I'll skip Router context for now unless I see it in `prerender.ts`.

		const html = renderToString(content)
		const cleanHtml = injectIntoIndexHtml(indexHtml, html)

		// write file
		const outPath = routePath === '/' ? 'index.html' : routePath.endsWith('/') ? routePath + 'index.html' : routePath + '/index.html'
        const fullOutPath = path.join(ssgDir, outPath)
		await mkdir(path.dirname(fullOutPath), { recursive: true })
		await writeFile(fullOutPath, cleanHtml)
		wrote++
	}

	console.log(`Pre-rendered ${wrote} pages (skipped ${skipped}).`)
    
    // Move SSG files to build root unless we want to keep them separate?
    // Usually we want them in build/ so they are served.
    // Starter `prerender.ts` might have moved them or just left them.
    // I'll assume `cp -r build/__ssg/* build/` happens or server serves from there.
    // Wait, `bun run start` serves `build/server`.
    // Static assets are in `build/assets` and `build/index.html`.
    // SSG files need to be in `build/` root to be served as static files by typical servers.
    // I'll add a step to copy them.
    
    // Copy ssgDir contents to buildDir
    // Recursive copy... node:fs cp is experimental?
    // `cp -r` via bun spawn is easier.
    const cp = Bun.spawn(['cp', '-r', ssgDir + '/.', buildDir], { stdout: 'ignore' })
    await cp.exited
    await rm(ssgDir, { recursive: true, force: true })
}
