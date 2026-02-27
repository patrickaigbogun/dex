import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import React from 'react'
import { renderToString } from 'react-dom/server'

type RenderStrategy = 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'

type DexConfig = {
	renderStrategy?: RenderStrategy
}

function resolveLayoutName(sel: unknown): string | undefined {
	if (!sel) return
	if (typeof sel === 'string') return sel
	if (typeof sel === 'function') {
		try {
			const v = sel()
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

	// Fallback: attempt to inject between opening + closing root div.
	const open = '<div id="root">'
	const close = '</div>'
	const i = indexHtml.indexOf(open)
	if (i === -1) throw new Error('Could not find <div id="root"> in index.html')
	const j = indexHtml.indexOf(close, i + open.length)
	if (j === -1) throw new Error('Could not find closing </div> for #root in index.html')
	return indexHtml.slice(0, i + open.length) + rendered + indexHtml.slice(j)
}

async function main() {
	const rootDir = path.resolve(import.meta.dir, '..')
	const buildDir = path.join(rootDir, 'build')
	const ssgDir = path.join(buildDir, '__ssg')

	const configMod: any = await import(path.join(rootDir, 'dex.config.ts') + `?t=${Date.now()}`)
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

	// GlobalLayout is optional; we reuse the starter's existing global layout.
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

		// MVP: only static routes; skip dynamic params + catch-all.
		if (!isStaticRoute(r?.segments)) {
			skipped++
			continue
		}

		const pageMod: any = await r.importPage()
		const Page = pageMod?.default
		if (!Page) {
			throw new Error(`SSG: route module missing default export: ${r?.file ?? routePath}`)
		}

		const pageStrategy: RenderStrategy | undefined = pageMod?.render

		const layoutName = resolveLayoutName(pageMod?.layout)
		let Layout: any
		let layoutStrategy: RenderStrategy | undefined
		if (layoutName && typeof layouts?.[layoutName] === 'function') {
			const layoutMod: any = await layouts[layoutName]!()
			Layout = getDefaultExport(layoutMod)
			layoutStrategy = layoutMod?.render
		}

		const finalStrategy = pageStrategy ?? layoutStrategy ?? appDefault
		if (finalStrategy !== 'ssg') {
			skipped++
			continue
		}

		const inner = Layout
			? React.createElement(Layout, null, React.createElement(Page))
			: React.createElement(Page)

		const tree = GlobalLayout
			? React.createElement(GlobalLayout, { children: inner })
			: inner

		const rendered = renderToString(tree)
		const outHtml = injectIntoIndexHtml(indexHtml, rendered)

		const rel = routePath === '/' ? '' : routePath.replace(/^\//, '')
		const outDir = rel ? path.join(ssgDir, rel) : ssgDir
		await mkdir(outDir, { recursive: true })
		await writeFile(path.join(outDir, 'index.html'), outHtml)
		wrote++
	}

	process.stdout.write(`✔ prerender: wrote ${wrote} SSG page(s), skipped ${skipped}\n`)
}

await main()
