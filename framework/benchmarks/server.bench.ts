import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { Elysia } from 'elysia'
import { dexAssetsRoute, dexDevReloadRouter, dexSpaFallback } from '../packages/server/src/index'

export type ServerBenchResult = {
	spaReqPerSec: number
	spaP95Ms: number
	ssgReqPerSec: number
	ssgP95Ms: number
	assetReqPerSec: number
	sseClientsConnected: number
	sseBroadcastLatencyMs: number
	sseRssDeltaMb: number
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
	return sorted[idx]!
}

async function benchEndpoint(app: Elysia, url: string, count: number) {
	const latencies: number[] = new Array(count)
	const start = performance.now()
	for (let i = 0; i < count; i++) {
		const s = performance.now()
		const res = await app.handle(new Request(url, { headers: { accept: 'text/html' } }))
		await res.text()
		latencies[i] = performance.now() - s
	}
	const totalMs = performance.now() - start
	latencies.sort((a, b) => a - b)
	return {
		reqPerSec: Math.round((count / totalMs) * 1000),
		p95Ms: Number(percentile(latencies, 95).toFixed(3)),
	}
}

export async function runServerBench(): Promise<ServerBenchResult> {
	const tmp = await mkdtemp(path.join(os.tmpdir(), 'dex-bench-server-'))
	const assetsDir = path.join(tmp, 'assets')
	const ssgDir = path.join(tmp, '__ssg')
	const indexHtmlPath = path.join(tmp, 'index.html')

	try {
		await mkdir(assetsDir, { recursive: true })
		await mkdir(path.join(ssgDir, 'about'), { recursive: true })
		await writeFile(indexHtmlPath, '<!doctype html><html><head><title>Dex</title></head><body><div id="root"></div></body></html>')
		await writeFile(path.join(ssgDir, 'about/index.html'), '<!doctype html><html><head><title>About</title></head><body><div id="root"><h1>About</h1></div></body></html>')
		await writeFile(path.join(assetsDir, 'client.js'), 'console.log("dex");\n'.repeat(200))

		const app = new Elysia()
			.use(dexAssetsRoute({ assetsDir }))
			.use(dexDevReloadRouter({ watchDirs: [assetsDir], watchFiles: [path.join(assetsDir, 'client.js')], pollIntervalMs: 50 }))
			.use(
				dexSpaFallback({
					indexHtmlPath,
					ssgDir,
					resolveHead: ({ pathname }) => ({ title: `Page ${pathname}` }),
				})
			)

		const spa = await benchEndpoint(app, 'http://localhost/dashboard/overview', 500)
		const ssg = await benchEndpoint(app, 'http://localhost/about', 500)
		const asset = await benchEndpoint(app, 'http://localhost/assets/client.js', 500)

		// SSE 100 concurrent clients fan-out benchmark
		const clientCount = 100
		const rssBefore = process.memoryUsage().rss
		const readers: ReadableStreamDefaultReader<Uint8Array>[] = []

		for (let i = 0; i < clientCount; i++) {
			const res = await app.handle(new Request('http://localhost/__dev/reload'))
			const reader = res.body!.getReader()
			// Read initial `retry: 250\n\n` chunk
			await reader.read()
			readers.push(reader)
		}

		const rssAfterConnect = process.memoryUsage().rss
		const broadcastStart = performance.now()
		// Touch watched file to trigger broadcastReload
		await writeFile(path.join(assetsDir, 'client.js'), `console.log("dex reload ${Date.now()}");\n`)

		await Promise.all(
			readers.map((reader) =>
				Promise.race([
					reader.read(),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
				])
			)
		)
		const sseBroadcastLatencyMs = Number((performance.now() - broadcastStart).toFixed(2))

		await Promise.all(readers.map((r) => r.cancel().catch(() => {})))

		return {
			spaReqPerSec: spa.reqPerSec,
			spaP95Ms: spa.p95Ms,
			ssgReqPerSec: ssg.reqPerSec,
			ssgP95Ms: ssg.p95Ms,
			assetReqPerSec: asset.reqPerSec,
			sseClientsConnected: readers.length,
			sseBroadcastLatencyMs,
			sseRssDeltaMb: Number(((rssAfterConnect - rssBefore) / (1024 * 1024)).toFixed(2)),
		}
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}
