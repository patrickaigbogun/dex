import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { generateFsRoutes, generateLayouts, sortRoutesByPrecedence, fileToRoute } from '../packages/router/src/generate'
import { findMatchingRoute } from '../packages/router/src/client/router'
import type { Route } from '../packages/router/src/types'

export type RouterBenchResult = {
	generate100Ms: number
	generate1000Ms: number
	match1000RoutesOpsPerSec: number
	matchP50Us: number
	matchP99Us: number
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
	return sorted[idx]!
}

async function createSyntheticPages(dir: string, count: number) {
	const pagesDir = path.join(dir, 'web/pages')
	const layoutsDir = path.join(dir, 'web/layouts')
	await mkdir(pagesDir, { recursive: true })
	await mkdir(layoutsDir, { recursive: true })
	await writeFile(path.join(layoutsDir, 'global.tsx'), 'export default function G({ children }: any) { return children }\n')

	const sections = ['blog', 'docs', 'products', 'users', 'dashboard', 'settings', 'projects', 'guides', 'api-ref', 'changelog']
	for (let i = 0; i < count; i++) {
		const sec = sections[i % sections.length]!
		const group = Math.floor(i / sections.length)
		const subDir = path.join(pagesDir, sec, `g${group}`)
		await mkdir(subDir, { recursive: true })
		const fileName = i % 15 === 0 ? '[id].tsx' : i % 40 === 0 ? '[...slug].tsx' : `page-${i}.tsx`
		await writeFile(
			path.join(subDir, fileName),
			`export default function Page${i}() { return null }\n`
		)
	}
}

export async function runRouterBench(): Promise<RouterBenchResult> {
	const tmp = await mkdtemp(path.join(os.tmpdir(), 'dex-bench-router-'))
	try {
		// 1. Generate 100 pages
		const dir100 = path.join(tmp, 'p100')
		await createSyntheticPages(dir100, 100)
		const t100 = performance.now()
		await generateFsRoutes({
			pagesDir: path.join(dir100, 'web/pages'),
			outTs: path.join(dir100, 'out/routes.ts'),
			outJson: path.join(dir100, 'out/manifest.json'),
		})
		await generateLayouts({
			layoutsDir: path.join(dir100, 'web/layouts'),
			outTs: path.join(dir100, 'out/layouts.ts'),
		})
		const generate100Ms = Number((performance.now() - t100).toFixed(2))

		// 2. Generate 1,000 pages
		const dir1000 = path.join(tmp, 'p1000')
		await createSyntheticPages(dir1000, 1000)
		const t1000 = performance.now()
		await generateFsRoutes({
			pagesDir: path.join(dir1000, 'web/pages'),
			outTs: path.join(dir1000, 'out/routes.ts'),
			outJson: path.join(dir1000, 'out/manifest.json'),
		})
		await generateLayouts({
			layoutsDir: path.join(dir1000, 'web/layouts'),
			outTs: path.join(dir1000, 'out/layouts.ts'),
		})
		const generate1000Ms = Number((performance.now() - t1000).toFixed(2))

		// 3. Route matching across 1,000 sorted routes
		const routes: Route[] = []
		const sections = ['blog', 'docs', 'products', 'users', 'dashboard', 'settings', 'projects', 'guides', 'api-ref', 'changelog']
		for (let i = 0; i < 1000; i++) {
			const sec = sections[i % sections.length]!
			const group = Math.floor(i / sections.length)
			const rel =
				i % 15 === 0
					? `${sec}/g${group}/[id]`
					: i % 40 === 0
						? `${sec}/g${group}/[...slug]`
						: `${sec}/g${group}/page-${i}`
			const { path: routePath, segments } = fileToRoute(rel)
			routes.push({
				file: `${rel}.tsx`,
				path: routePath,
				segments,
				importPage: async () => ({ default: () => null }),
			})
		}
		sortRoutesByPrecedence(routes)

		const probes = [
			'/blog/g0/page-0', // early static
			'/changelog/g99/page-999', // late static
			'/users/g3/hello-world', // dynamic param
			'/blog/g4/a/b/c/d', // catch-all
			'/does/not/exist/at/all', // 404 worst-case scan
		]

		const iterations = 5000
		const latenciesUs: number[] = new Array(iterations)
		const matchStart = performance.now()
		for (let i = 0; i < iterations; i++) {
			const probe = probes[i % probes.length]!
			const s = performance.now()
			findMatchingRoute(routes, probe)
			latenciesUs[i] = (performance.now() - s) * 1000
		}
		const matchTotalMs = performance.now() - matchStart
		latenciesUs.sort((a, b) => a - b)

		return {
			generate100Ms,
			generate1000Ms,
			match1000RoutesOpsPerSec: Math.round((iterations / matchTotalMs) * 1000),
			matchP50Us: Number(percentile(latenciesUs, 50).toFixed(2)),
			matchP99Us: Number(percentile(latenciesUs, 99).toFixed(2)),
		}
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}
