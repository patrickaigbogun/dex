import { cp, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { gzipSync } from 'node:zlib'
import { generateFsRoutes, generateLayouts } from '../packages/router/src/generate'
import { dexBuildClient, dexPrepareBuild } from '../packages/dev/src/tasks'

export type BundleBenchResult = {
	clientBuildMs: number
	clientJsBytes: number
	clientJsGzipBytes: number
	chunkCount: number
	totalAssetsBytes: number
	totalAssetsGzipBytes: number
}

async function collectFiles(dir: string): Promise<string[]> {
	const out: string[] = []
	const entries = await readdir(dir, { withFileTypes: true })
	for (const e of entries) {
		const full = path.join(dir, e.name)
		if (e.isDirectory()) {
			out.push(...(await collectFiles(full)))
		} else {
			out.push(full)
		}
	}
	return out
}

export async function runBundleBench(): Promise<BundleBenchResult> {
	const repoRoot = path.resolve(import.meta.dir, '../..')
	const starterDir = path.join(repoRoot, 'templates/starter')
	const tmp = await mkdtemp(path.join(os.tmpdir(), 'dex-bench-bundle-'))

	try {
		await cp(starterDir, tmp, {
			recursive: true,
			filter: (src) => !src.includes('node_modules') && !src.includes('/build'),
		})

		// Install workspace deps cleanly via bun install (fast with global cache)
		const installProc = Bun.spawn(['bun', 'install', '--no-progress'], {
			cwd: tmp,
			stdout: 'ignore',
			stderr: 'pipe',
		})
		if ((await installProc.exited) !== 0) {
			const errText = await new Response(installProc.stderr).text()
			throw new Error(`bun install failed in bundle bench: ${errText}`)
		}

		await generateFsRoutes({
			pagesDir: path.join(tmp, 'web/pages'),
			outTs: path.join(tmp, '.dex/generated/routes.ts'),
			outJson: path.join(tmp, '.dex/generated/manifest.json'),
		})
		await generateLayouts({
			layoutsDir: path.join(tmp, 'web/layouts'),
			outTs: path.join(tmp, '.dex/generated/layouts.ts'),
		})
		await dexPrepareBuild({ rootDir: tmp })

		const start = performance.now()
		await dexBuildClient({ rootDir: tmp, defineArgs: [] })
		const clientBuildMs = Number((performance.now() - start).toFixed(2))

		const assetsDir = path.join(tmp, 'build/assets')
		const files = await collectFiles(assetsDir)
		const clientJsPath = path.join(assetsDir, 'client.js')
		const clientBuf = await readFile(clientJsPath)
		const clientJsBytes = clientBuf.byteLength
		const clientJsGzipBytes = gzipSync(clientBuf).byteLength

		let totalAssetsBytes = 0
		let totalAssetsGzipBytes = 0
		let chunkCount = 0

		for (const f of files) {
			const buf = await readFile(f)
			totalAssetsBytes += buf.byteLength
			totalAssetsGzipBytes += gzipSync(buf).byteLength
			if (f.includes(`${path.sep}chunks${path.sep}`)) {
				chunkCount++
			}
		}

		return {
			clientBuildMs,
			clientJsBytes,
			clientJsGzipBytes,
			chunkCount,
			totalAssetsBytes,
			totalAssetsGzipBytes,
		}
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}
