import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { watchAndGenerate } from '../src/generate'

const tempDirs: string[] = []

async function makeTempProject() {
	const dir = await mkdtemp(path.join(os.tmpdir(), 'dex-watcher-test-'))
	tempDirs.push(dir)
	const pagesDir = path.join(dir, 'pages')
	const layoutsDir = path.join(dir, 'layouts')
	const outDir = path.join(dir, '.generated')
	await mkdir(pagesDir, { recursive: true })
	await mkdir(layoutsDir, { recursive: true })
	await mkdir(outDir, { recursive: true })
	return {
		dir,
		pagesDir,
		layoutsDir,
		outRoutesTs: path.join(outDir, 'routes.ts'),
		outRoutesJson: path.join(outDir, 'manifest.json'),
		outLayoutsTs: path.join(outDir, 'layouts.ts'),
	}
}

async function waitForFileContains(filePath: string, needle: string, timeoutMs = 3000) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const content = await readFile(filePath, 'utf8')
			if (content.includes(needle)) return content
		} catch {
			// retry
		}
		await new Promise((r) => setTimeout(r, 40))
	}
	return await readFile(filePath, 'utf8')
}

afterEach(async () => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop()!
		await rm(dir, { recursive: true, force: true })
	}
})

describe('watchAndGenerate', () => {
	it('generates initial routes, regenerates on file creation, and stops cleanly', async () => {
		const proj = await makeTempProject()
		await writeFile(path.join(proj.pagesDir, 'index.tsx'), 'export default function Home() { return null }\n')

		const listenerCountsBefore = {
			sigint: process.listenerCount('SIGINT'),
			sigterm: process.listenerCount('SIGTERM'),
		}

		const handle = await watchAndGenerate({
			pagesDir: proj.pagesDir,
			layoutsDir: proj.layoutsDir,
			outRoutesTs: proj.outRoutesTs,
			outRoutesJson: proj.outRoutesJson,
			outLayoutsTs: proj.outLayoutsTs,
		})

		try {
			expect(typeof handle.stop).toBe('function')
			expect(process.listenerCount('SIGINT')).toBe(listenerCountsBefore.sigint + 1)
			expect(process.listenerCount('SIGTERM')).toBe(listenerCountsBefore.sigterm + 1)

			const initialManifest = JSON.parse(await readFile(proj.outRoutesJson, 'utf8'))
			expect(initialManifest.routes.map((r: any) => r.path)).toEqual(['/'])

			await writeFile(path.join(proj.pagesDir, 'about.tsx'), 'export default function About() { return null }\n')

			const updatedContent = await waitForFileContains(proj.outRoutesJson, '"/about"')
			const updatedManifest = JSON.parse(updatedContent)
			expect(updatedManifest.routes.map((r: any) => r.path)).toContain('/about')
		} finally {
			handle.stop()
		}

		expect(process.listenerCount('SIGINT')).toBe(listenerCountsBefore.sigint)
		expect(process.listenerCount('SIGTERM')).toBe(listenerCountsBefore.sigterm)

		// Creating another file after stop() should NOT regenerate routes
		await writeFile(path.join(proj.pagesDir, 'after-stop.tsx'), 'export default function AfterStop() { return null }\n')
		await new Promise((r) => setTimeout(r, 250))
		const finalManifest = JSON.parse(await readFile(proj.outRoutesJson, 'utf8'))
		expect(finalManifest.routes.map((r: any) => r.path)).not.toContain('/after-stop')
	})

	it('logs a warning when pages directory does not exist and supports AbortSignal', async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), 'dex-watcher-missing-'))
		tempDirs.push(dir)

		const warnings: string[] = []
		const origWarn = console.warn
		console.warn = (...args: any[]) => {
			warnings.push(args.map(String).join(' '))
		}

		const controller = new AbortController()
		try {
			const handle = await watchAndGenerate({
				pagesDir: path.join(dir, 'nonexistent-pages'),
				layoutsDir: path.join(dir, 'nonexistent-layouts'),
				outRoutesTs: path.join(dir, '.generated/routes.ts'),
				outRoutesJson: path.join(dir, '.generated/manifest.json'),
				outLayoutsTs: path.join(dir, '.generated/layouts.ts'),
				signal: controller.signal,
			})
			expect(typeof handle.stop).toBe('function')
			expect(warnings.some((w) => w.includes('[dex-router] watch warning:') && w.includes('does not exist'))).toBe(true)
			controller.abort()
		} finally {
			console.warn = origWarn
		}
	})

	it('preserves pendingRescan across coalesced events and cleans up listeners on startup failure', async () => {
		const proj = await makeTempProject()
		await writeFile(path.join(proj.pagesDir, 'index.tsx'), 'export default function Home() { return null }\n')

		const handle = await watchAndGenerate({
			pagesDir: proj.pagesDir,
			layoutsDir: proj.layoutsDir,
			outRoutesTs: proj.outRoutesTs,
			outRoutesJson: proj.outRoutesJson,
			outLayoutsTs: proj.outLayoutsTs,
		})

		try {
			// Create a new subdirectory and immediately create a .tsx file inside it so schedule(true) is followed by schedule(false)
			const subDir = path.join(proj.pagesDir, 'blog')
			await mkdir(subDir, { recursive: true })
			await writeFile(path.join(subDir, 'first.tsx'), 'export default function First() { return null }\n')

			await waitForFileContains(proj.outRoutesJson, '"/blog/first"')

			// Creating a second file inside the new subdirectory verifies ensureWatched() registered a watcher on subDir
			await writeFile(path.join(subDir, 'second.tsx'), 'export default function Second() { return null }\n')
			const updated = await waitForFileContains(proj.outRoutesJson, '"/blog/second"')
			expect(JSON.parse(updated).routes.map((r: any) => r.path)).toContain('/blog/second')
		} finally {
			handle.stop()
		}

		// Startup failure: outRoutesTs parent path is an existing file, causing mkdir to fail
		const blockingFile = path.join(proj.dir, 'not-a-dir')
		await writeFile(blockingFile, 'blocking')

		const sigintBefore = process.listenerCount('SIGINT')
		const sigtermBefore = process.listenerCount('SIGTERM')

		await expect(
			watchAndGenerate({
				pagesDir: proj.pagesDir,
				layoutsDir: proj.layoutsDir,
				outRoutesTs: path.join(blockingFile, 'routes.ts'),
				outRoutesJson: proj.outRoutesJson,
				outLayoutsTs: proj.outLayoutsTs,
			})
		).rejects.toThrow()

		expect(process.listenerCount('SIGINT')).toBe(sigintBefore)
		expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore)
	})
})
