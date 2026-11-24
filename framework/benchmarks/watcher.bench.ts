import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { generateFsRoutes, generateLayouts } from '../packages/router/src/generate'

export type WatcherBenchResult = {
	cycles: number
	pageCount: number
	avgRegenMs: number
	rssDeltaMb: number
}

export async function runWatcherBench(): Promise<WatcherBenchResult> {
	const tmp = await mkdtemp(path.join(os.tmpdir(), 'dex-bench-watcher-'))
	const pagesDir = path.join(tmp, 'web/pages')
	const layoutsDir = path.join(tmp, 'web/layouts')
	const pageCount = 200
	const cycles = 50

	try {
		await mkdir(pagesDir, { recursive: true })
		await mkdir(layoutsDir, { recursive: true })
		await writeFile(path.join(layoutsDir, 'global.tsx'), 'export default function G({ children }: any) { return children }\n')

		for (let i = 0; i < pageCount; i++) {
			await writeFile(path.join(pagesDir, `page-${i}.tsx`), `export default function P${i}() { return null }\n`)
		}

		// Warmup once
		await generateFsRoutes({
			pagesDir,
			outTs: path.join(tmp, 'out/routes.ts'),
			outJson: path.join(tmp, 'out/manifest.json'),
		})

		const rssStart = process.memoryUsage().rss
		const t0 = performance.now()
		for (let c = 0; c < cycles; c++) {
			await writeFile(path.join(pagesDir, `page-${c % pageCount}.tsx`), `export default function P() { return ${c} }\n`)
			await generateFsRoutes({
				pagesDir,
				outTs: path.join(tmp, 'out/routes.ts'),
				outJson: path.join(tmp, 'out/manifest.json'),
			})
			await generateLayouts({
				layoutsDir,
				outTs: path.join(tmp, 'out/layouts.ts'),
			})
		}
		const totalMs = performance.now() - t0
		const rssEnd = process.memoryUsage().rss

		return {
			cycles,
			pageCount,
			avgRegenMs: Number((totalMs / cycles).toFixed(2)),
			rssDeltaMb: Number(((rssEnd - rssStart) / (1024 * 1024)).toFixed(2)),
		}
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}
