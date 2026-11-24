#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runRouterBench, type RouterBenchResult } from './router.bench'
import { runSsgBench, type SsgBenchResult } from './ssg.bench'
import { runBundleBench, type BundleBenchResult } from './bundle.bench'
import { runServerBench, type ServerBenchResult } from './server.bench'
import { runWatcherBench, type WatcherBenchResult } from './watcher.bench'
import { runCliBench, type CliBenchResult } from './cli.bench'

export type BenchmarkReport = {
	timestamp: string
	environment: {
		platform: string
		arch: string
		bun: string
		cpus: number
	}
	router: RouterBenchResult
	ssg: SsgBenchResult
	bundle: BundleBenchResult
	server: ServerBenchResult
	watcher: WatcherBenchResult
	cli: CliBenchResult
}

const BASELINE_PATH = path.join(import.meta.dir, 'baseline.json')

function checkRegression(
	label: string,
	current: number,
	baseline: number,
	maxRatio: number,
	higherIsBetter = false
): string | null {
	if (baseline <= 0) return null
	if (higherIsBetter) {
		if (current < baseline / maxRatio) {
			return `${label} regressed: ${current} vs baseline ${baseline} (min allowed: ${(baseline / maxRatio).toFixed(2)})`
		}
		return null
	}
	if (current > baseline * maxRatio) {
		return `${label} regressed: ${current} vs baseline ${baseline} (max allowed: ${(baseline * maxRatio).toFixed(2)})`
	}
	return null
}

async function main() {
	const args = new Set(process.argv.slice(2))
	const jsonMode = args.has('--json')
	const writeBaseline = args.has('--write-baseline')
	const checkMode = args.has('--check')

	const log = (msg: string) => {
		if (!jsonMode) console.log(msg)
	}

	log('Running Dex v0.5 Benchmark Suite...\n')

	log('▶ [1/6] Router generation & matching (100 / 1,000 pages)')
	const router = await runRouterBench()

	log('▶ [2/6] SSG prerender throughput (500 pages + head + fonts)')
	const ssg = await runSsgBench()

	log('▶ [3/6] Client ESM bundle & chunk budgets (templates/starter)')
	const bundle = await runBundleBench()

	log('▶ [4/6] Server latency & 100-client SSE fan-out')
	const server = await runServerBench()

	log('▶ [5/6] File watcher regeneration & memory (50 cycles × 200 pages)')
	const watcher = await runWatcherBench()

	log('▶ [6/6] Native Go CLI startup & 100-endpoint OpenAPI YAML codegen')
	const cli = await runCliBench()

	const report: BenchmarkReport = {
		timestamp: new Date().toISOString(),
		environment: {
			platform: process.platform,
			arch: process.arch,
			bun: Bun.version,
			cpus: os.cpus().length,
		},
		router,
		ssg,
		bundle,
		server,
		watcher,
		cli,
	}

	if (writeBaseline) {
		await writeFile(BASELINE_PATH, JSON.stringify(report, null, 2) + '\n')
		log(`\nSaved baseline to ${BASELINE_PATH}`)
	}

	if (jsonMode) {
		console.log(JSON.stringify(report, null, 2))
	} else {
		console.log('\n=== Dex Benchmark Summary ===')
		console.log(`Router generate (100 / 1,000 pages): ${router.generate100Ms}ms / ${router.generate1000Ms}ms`)
		console.log(`Router match (1,000 routes):         ${router.match1000RoutesOpsPerSec.toLocaleString()} ops/s (p50 ${router.matchP50Us}µs, p99 ${router.matchP99Us}µs)`)
		console.log(`SSG prerender (500 pages):           ${ssg.totalMs}ms (${ssg.pagesPerSec.toLocaleString()} pages/s, peak RSS ${ssg.peakRssMb} MB)`)
		console.log(`Client ESM build:                    ${bundle.clientBuildMs}ms | client.js ${(bundle.clientJsBytes / 1024).toFixed(1)} KB (${(bundle.clientJsGzipBytes / 1024).toFixed(1)} KB gz) | ${bundle.chunkCount} chunks`)
		console.log(`Server throughput (SPA / SSG / Asset): ${server.spaReqPerSec} / ${server.ssgReqPerSec} / ${server.assetReqPerSec} req/s (SPA p95 ${server.spaP95Ms}ms)`)
		console.log(`SSE fan-out (${server.sseClientsConnected} clients):          ${server.sseBroadcastLatencyMs}ms broadcast, +${server.sseRssDeltaMb} MB RSS`)
		console.log(`Watcher regen (50×200 pages):        ${watcher.avgRegenMs}ms avg, RSS delta ${watcher.rssDeltaMb} MB`)
		console.log(`Go CLI binary & startup:             ${cli.binarySizeMb} MB | ${cli.startupMedianMs}ms median startup | 100-endpoint YAML pie generate ${cli.pieGenerate100EndpointsMs}ms`)
	}

	if (checkMode) {
		if (!existsSync(BASELINE_PATH)) {
			console.error(`Baseline not found at ${BASELINE_PATH}. Run with --write-baseline first.`)
			process.exit(1)
		}
		const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8')) as BenchmarkReport
		const failures = [
			checkRegression('router.generate1000Ms', router.generate1000Ms, baseline.router.generate1000Ms, 3.0),
			checkRegression('router.matchP99Us', router.matchP99Us, baseline.router.matchP99Us, 3.0),
			checkRegression('ssg.pagesPerSec', ssg.pagesPerSec, baseline.ssg.pagesPerSec, 3.0, true),
			checkRegression('bundle.clientJsGzipBytes', bundle.clientJsGzipBytes, baseline.bundle.clientJsGzipBytes, 1.25),
			checkRegression('cli.binarySizeMb', cli.binarySizeMb, baseline.cli.binarySizeMb, 1.25),
			checkRegression('cli.startupMedianMs', cli.startupMedianMs, baseline.cli.startupMedianMs, 3.0),
		].filter(Boolean) as string[]

		if (failures.length > 0) {
			console.error('\nBenchmark regressions detected:')
			for (const f of failures) console.error(`  - ${f}`)
			process.exit(1)
		}
		log('\nAll benchmark regression gates passed ✓')
	}

	process.exit(0)
}

await main()
