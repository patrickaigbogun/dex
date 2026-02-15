import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import crypto from 'node:crypto'

type Mode = 'spa' | 'mpa'

type DexConfig = {
	mode?: Mode
	port?: number
	packageVersions?: Record<string, string>
}

const DEFAULT_PACKAGES = ['router', 'server', 'dev', 'pie']

function usage(exitCode = 0): never {
	const out = exitCode === 0 ? console.log : console.error
	out(`dex

Usage:
  dex scaffold <dir>
  dex sync [--interactive]
	dex tag <patch|minor|major>
  dex build
  dex start [-p]

Scaffold options:
  --repo <owner/repo>        GitHub repo containing release templates
  --tag <tag|latest>         Release tag (default: latest)
	--packages-repo <owner/repo>  GitHub repo containing dex-package-*.tgz assets
	--packages-tag <tag|latest>   Release tag for dex-package-*.tgz assets
	--template <path>          Use local template .tgz instead of GitHub
	--template-url <url>       Download template .tgz from a URL (skips GitHub)
  --no-install               Do not run bun install

Sync options:
  --interactive              Interactively select files to sync (default: all)
  --repo <owner/repo>        Template repo (default from .dex/metadata.json)
  --tag <tag>                Release tag (default: latest)

Start options:
  -p                         Production mode (NODE_ENV=production)

Tag options:
	patch                      Bump SemVer patch (e.g. v0.1.44 -> v0.1.45)
	minor                      Bump SemVer minor (e.g. v0.1.44 -> v0.2.0)
	major                      Bump SemVer major (e.g. v0.1.44 -> v1.0.0)

Version:
  -v, --version              Show CLI version
  --version -f               Show framework template version (if in scaffolded project)

Environment:
  DEX_TEMPLATE_REPO          Default template repo (owner/repo)
	DEX_TEMPLATE_TGZ           Local template .tgz path (skips GitHub)
	DEX_TEMPLATE_URL           Template .tgz URL (skips GitHub)
	DEX_PACKAGE_REPO           Package repo (owner/repo) for dex-package-*.tgz assets
	DEX_PACKAGE_TAG            Release tag for dex-package-*.tgz (default: template tag)
  DEX_CACHE_DIR              Optional cache directory for template downloads
  DEX_TEMPLATE_CACHE_TTL_MS   TTL for cached 'latest' template (default: 1800000)
	DEX_FETCH_TIMEOUT_MS        Network timeout for GitHub fetches (default: 30000)
  GITHUB_TOKEN               Optional GitHub token (avoids rate limits)
`)
	process.exit(exitCode)
}

function createSteps() {
	return async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
		const start = performance.now()
		process.stdout.write(`\n▶ ${name}\n`)
		try {
			const out = await fn()
			process.stdout.write(`✔ ${name} (${Math.round(performance.now() - start)}ms)\n`)
			return out
		} catch (err) {
			process.stderr.write(`✖ ${name} (${Math.round(performance.now() - start)}ms)\n`)
			throw err
		}
	}
}

function fetchTimeoutMs() {
	const raw = process.env.DEX_FETCH_TIMEOUT_MS
	if (!raw) return 30_000
	const n = Number(raw)
	return Number.isFinite(n) && n >= 0 ? n : 30_000
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
	const controller = new AbortController()
	const t = setTimeout(() => controller.abort(), fetchTimeoutMs())
	try {
		return await fetch(url, { ...init, signal: controller.signal })
	} catch (err: any) {
		if (err?.name === 'AbortError') throw new Error(`Request timed out: ${url}`)
		throw err
	} finally {
		clearTimeout(t)
	}
}

function parseArgs(argv: string[]) {
	const positional: string[] = []
	const flags: Record<string, string | boolean> = {}
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]!
		if (!a.startsWith('-')) {
			positional.push(a)
			continue
		}
		if (a === '--no-install' || a === '-v' || a === '--version' || a === '-f') {
			flags[a.replace(/^--?/, '')] = true
			continue
		}
		if (a === '-p') {
			flags['p'] = true
			continue
		}
		const next = argv[i + 1]
		if (!next || next.startsWith('-')) {
			flags[a.replace(/^--?/, '')] = true
			continue
		}
		flags[a.replace(/^--?/, '')] = next
		i++
	}
	return { positional, flags }
}

async function promptSelect(question: string, options: string[]) {
	const stdin = process.stdin
	const stdout = process.stdout
	stdout.write(`${question}\n`)
	for (let i = 0; i < options.length; i++) stdout.write(`  ${i + 1}) ${options[i]}\n`)
	stdout.write(`> `)

	stdin.setEncoding('utf8')
	const answer = await new Promise<string>((resolve) => {
		stdin.once('data', (d) => resolve(String(d).trim()))
	})
	const n = Number(answer)
	if (!Number.isFinite(n) || n < 1 || n > options.length) throw new Error('Invalid selection')
	return options[n - 1]!
}

async function promptMultiSelect(question: string, options: string[]): Promise<string[]> {
	const stdin = process.stdin
	const stdout = process.stdout
	stdout.write(`${question}\n`)
	const selected = new Set<number>()
	
	let displaying = true
	while (displaying) {
		stdout.write('\nOptions:\n')
		for (let i = 0; i < options.length; i++) {
			const checked = selected.has(i) ? '[x]' : '[ ]'
			stdout.write(`  ${checked} ${i + 1}) ${options[i]}\n`)
		}
		stdout.write('\nEnter number to toggle, or "done" to finish: > ')

		stdin.setEncoding('utf8')
		const answer = await new Promise<string>((resolve) => {
			stdin.once('data', (d) => resolve(String(d).trim()))
		})

		if (answer.toLowerCase() === 'done') {
			displaying = false
		} else {
			const n = Number(answer)
			if (Number.isFinite(n) && n >= 1 && n <= options.length) {
				const idx = n - 1
				if (selected.has(idx)) {
					selected.delete(idx)
				} else {
					selected.add(idx)
				}
			}
		}
	}

	return Array.from(selected)
		.sort((a, b) => a - b)
		.map((i) => options[i]!)
}

async function promptConfirm(question: string): Promise<boolean> {
	const stdin = process.stdin
	const stdout = process.stdout
	stdout.write(`${question} (y/n) > `)

	stdin.setEncoding('utf8')
	const answer = await new Promise<string>((resolve) => {
		stdin.once('data', (d) => resolve(String(d).trim().toLowerCase()))
	})

	return answer === 'y' || answer === 'yes'
}

async function getLatestReleaseTag(repo: string): Promise<string | null> {
	try {
		const release = await githubRelease(repo, 'latest')
		return release?.tag_name
	} catch {
		return null
	}
}

type TemplateDiff = {
	version: string
	previousVersion: string | null
	changedFiles: string[]
}

async function fetchTemplateDiff(repo: string, tag: string): Promise<TemplateDiff | null> {
	const asset = `dex-diff-${tag}.json`
	const url = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${asset}`
	
	const headers: Record<string, string> = {}
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

	try {
		const res = await fetchWithTimeout(url, { headers })
		if (!res.ok) return null
		return (await res.json()) as TemplateDiff
	} catch {
		return null
	}
}

async function cmdSync(flags: Record<string, string | boolean>) {
	const step = createSteps()

	const found = await step('Locate project', async () => {
		const proj = await findProjectRoot(process.cwd())
		if (!proj) throw new Error('Not in a Dex project (missing dex.config.*)')
		return proj
	})

	const metadata = await step('Load template metadata', async () => {
		const meta = await getTemplateMetadata()
		if (!meta) {
			// Metadata not found, but project exists. Ask if user wants to continue
			const proceed = await promptConfirm('This is an older Dex project without metadata. Continue syncing?')
			if (!proceed) {
				console.log('Cancelled.')
				process.exit(0)
			}
			// Return empty metadata; user must provide --repo
			return {}
		}
		return meta
	})

	const repo = (flags.repo as string | undefined) ?? (metadata as any)?.repo ?? process.env.DEX_TEMPLATE_REPO
	if (!repo) throw new Error('Missing repo. Provide --repo <owner/repo> or set DEX_TEMPLATE_REPO')

	let tag = (flags.tag as string | undefined) ?? (metadata as any)?.releaseTag
	if (!tag) {
		process.stdout.write(`\n⚠ No --tag provided. Fetching latest release...\n`)
		tag = await getLatestReleaseTag(repo)
		if (!tag) throw new Error('Could not determine latest release tag')
		process.stdout.write(`ℹ Using tag: ${tag}\n`)
	}

	const diff = await step('Fetch template diff', async () => {
		const d = await fetchTemplateDiff(repo, tag)
		if (!d) throw new Error(`Diff not found for ${repo}@${tag}`)
		return d
	})

	let filesToSync: string[] = []
	if (flags.interactive) {
		filesToSync = await step('Select files to sync', async () => {
			const selected = await promptMultiSelect('Select files to sync:', diff.changedFiles)
			// Close stdin after interactive prompt to prevent process from hanging
			if (process.stdin.destroy) {
				try {
					process.stdin.destroy()
				} catch {}
			}
			return selected
		})
	} else {
		filesToSync = diff.changedFiles
		process.stdout.write(`\n▶ Auto-sync all ${filesToSync.length} changed files\n`)
	}

	if (filesToSync.length === 0) {
		console.log('No files selected. Exiting.')
		return
	}

	await step('Download and sync template', async () => {
		const templateAsset = 'dex-template-spa.tgz'
		const { path: tgzPath } = await getTemplateTgzPath(repo, tag, templateAsset)

		const tempExtractDir = path.join(os.tmpdir(), `dex-sync-${Date.now()}`)
		await mkdir(tempExtractDir, { recursive: true })

		try {
			await extractTemplate(tgzPath, tempExtractDir)

			for (const file of filesToSync) {
				const src = path.join(tempExtractDir, file)
				const dst = path.join(found.root, file)

				if (!existsSync(src)) {
					process.stdout.write(`   ⊘ source not found: ${file}\n`)
					continue
				}

				await mkdir(path.dirname(dst), { recursive: true })
				await Bun.write(dst, Bun.file(src))
				process.stdout.write(`   ✓ ${file}\n`)
			}
		} finally {
			// cleanup temp dir
			try {
				await (await import('node:fs/promises')).rm(tempExtractDir, { recursive: true, force: true })
			} catch {
				// ignore
			}
		}
	})

	await step('Update metadata', async () => {
		await writeDexMetadata(found.root, tag, tag)
	})

	console.log(`\nSynced ${filesToSync.length} files from ${repo}@${tag} ✓`)

	// Exit process to ensure stdin is closed and process terminates
	process.exit(0)
}

function repoFromEnvOrFlag(flags: Record<string, string | boolean>): string {
	const repo = (flags.repo as string | undefined) ?? process.env.DEX_TEMPLATE_REPO
	if (!repo || typeof repo !== 'string') {
		throw new Error('Missing template repo. Provide --repo <owner/repo> or set DEX_TEMPLATE_REPO.')
	}
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error(`Invalid --repo format: ${repo}`)
	return repo
}

function packageRepoFromEnvOrFlag(flags: Record<string, string | boolean>): string | null {
	const repo = (flags['packages-repo'] as string | undefined) ?? process.env.DEX_PACKAGE_REPO
	if (!repo) return null
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error(`Invalid package repo format: ${repo}`)
	return repo
}

function packageTagFromEnvOrFlag(flags: Record<string, string | boolean>): string | null {
	const tag = (flags['packages-tag'] as string | undefined) ?? process.env.DEX_PACKAGE_TAG
	if (!tag) return null
	return String(tag)
}

async function githubRelease(repo: string, tag: string) {
	const url =
		tag === 'latest'
			? `https://api.github.com/repos/${repo}/releases/latest`
			: `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`

	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
	}
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

	const res = await fetchWithTimeout(url, { headers })
	if (!res.ok) throw new Error(`Failed to fetch release (${res.status}): ${await res.text()}`)
	return (await res.json()) as any
}

async function download(url: string) {
	const headers: Record<string, string> = {}
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
	const res = await fetchWithTimeout(url, { headers, redirect: 'follow' })
	if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
	return new Uint8Array(await res.arrayBuffer())
}

function cacheRootDir() {
	const fromEnv = process.env.DEX_CACHE_DIR
	if (fromEnv && fromEnv.trim()) return fromEnv
	const xdg = process.env.XDG_CACHE_HOME
	if (xdg && xdg.trim()) return path.join(xdg, 'dex')
	const home = os.homedir()
	if (process.platform === 'darwin') return path.join(home, 'Library', 'Caches', 'dex')
	if (process.platform === 'win32') {
		const local = process.env.LOCALAPPDATA
		if (local && local.trim()) return path.join(local, 'dex', 'Cache')
	}
	return path.join(home, '.cache', 'dex')
}

function latestCacheTtlMs() {
	const raw = process.env.DEX_TEMPLATE_CACHE_TTL_MS
	if (!raw) return 30 * 60 * 1000
	const n = Number(raw)
	return Number.isFinite(n) && n >= 0 ? n : 30 * 60 * 1000
}

function cachePathForTemplate(repo: string, tag: string, assetName: string) {
	const safeRepo = repo.replace(/\//g, '__')
	return path.join(cacheRootDir(), 'templates', safeRepo, tag, assetName)
}

async function downloadToFile(url: string, filePath: string) {
	const headers: Record<string, string> = {}
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
	process.stdout.write(`   downloading: ${url}\n`)
	const res = await fetchWithTimeout(url, { headers, redirect: 'follow' })
	if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
	if (!res.body) throw new Error(`Download failed (empty body): ${url}`)

	// Stream to disk (avoid buffering large templates in memory)
	const fromWeb = (Readable as any).fromWeb as ((s: any) => any) | undefined
	if (fromWeb) {
		await pipeline(fromWeb(res.body as any), createWriteStream(filePath))
		return
	}

	// Fallback: buffer (should be rare)
	await writeFile(filePath, new Uint8Array(await res.arrayBuffer()))
}

function cachePathForTemplateUrl(url: string) {
	const hash = crypto.createHash('sha1').update(url).digest('hex')
	return path.join(cacheRootDir(), 'templates', 'url', `${hash}.tgz`)
}

async function getTemplateTgzPathFromUrl(url: string) {
	const cachePath = cachePathForTemplateUrl(url)
	if (existsSync(cachePath)) return { path: cachePath, cache: 'hit' as const }
	await mkdir(path.dirname(cachePath), { recursive: true })
	const tmp = `${cachePath}.tmp-${process.pid}-${Date.now()}`
	await downloadToFile(url, tmp)
	await rename(tmp, cachePath)
	return { path: cachePath, cache: 'miss' as const }
}

async function getTemplateTgzPath(repo: string, tag: string, assetName: string) {
	const cachePath = cachePathForTemplate(repo, tag, assetName)
	const ttlMs = latestCacheTtlMs()

	if (existsSync(cachePath)) {
		if (tag !== 'latest') return { path: cachePath, cache: 'hit' as const }
		try {
			const s = await stat(cachePath)
			const age = Date.now() - s.mtimeMs
			if (age <= ttlMs) return { path: cachePath, cache: 'hit' as const }
		} catch {
			// ignore
		}
	}

	const rel = await githubRelease(repo, tag)
	const asset = (rel.assets as any[])?.find((a) => a?.name === assetName)
	if (!asset) {
		const names = ((rel.assets as any[]) ?? []).map((a) => a?.name).filter(Boolean)
		throw new Error(`Missing release asset ${assetName}. Available: ${names.join(', ') || '(none)'}`)
	}

	await mkdir(path.dirname(cachePath), { recursive: true })
	const tmp = `${cachePath}.tmp-${process.pid}-${Date.now()}`
	await downloadToFile(asset.browser_download_url, tmp)
	await rename(tmp, cachePath)
	return { path: cachePath, cache: 'miss' as const }
}

function templatePathFromEnvOrFlag(flags: Record<string, string | boolean>) {
	const p = (flags.template as string | undefined) ?? process.env.DEX_TEMPLATE_TGZ
	if (!p) return null
	if (typeof p !== 'string') return null
	return path.resolve(p)
}

function templateUrlFromEnvOrFlag(flags: Record<string, string | boolean>) {
	const u = (flags['template-url'] as string | undefined) ?? (flags.templateUrl as string | undefined) ?? process.env.DEX_TEMPLATE_URL
	if (!u) return null
	if (typeof u !== 'string') return null
	return u
}

function octalToNumber(oct: string) {
	const t = oct.replace(/\0.*$/, '').trim()
	if (!t) return 0
	return Number.parseInt(t, 8)
}

function safeJoin(destRoot: string, rel: string) {
	const normalized = rel.replace(/\\/g, '/').replace(/^\//, '')
	const parts = normalized.split('/').filter(Boolean)
	if (parts.some((p) => p === '..' || p.includes(':'))) throw new Error(`Unsafe path in template: ${rel}`)
	return path.join(destRoot, ...parts)
}

async function extractTarGz(buf: Uint8Array, destDir: string) {
	// gunzip
	const zlib = await import('node:zlib')
	const tar = zlib.gunzipSync(buf)

	let offset = 0
	const block = 512
	while (offset + block <= tar.length) {
		const header = tar.subarray(offset, offset + block)
		offset += block

		const nameRaw = Buffer.from(header.subarray(0, 100)).toString('utf8')
		const name = nameRaw.replace(/\0.*$/, '')
		if (!name) break

		const sizeRaw = Buffer.from(header.subarray(124, 136)).toString('utf8')
		const size = octalToNumber(sizeRaw)
		const typeflag = String.fromCharCode(header[156] || 0)

		const fileData = tar.subarray(offset, offset + size)
		const padded = Math.ceil(size / block) * block
		offset += padded

		// Strip the top-level folder GitHub puts in archives if present.
		const parts = name.split('/').filter(Boolean)
		const rel = parts.length > 1 ? parts.slice(1).join('/') : ''
		if (!rel) continue

		const outPath = safeJoin(destDir, rel)

		if (typeflag === '5') {
			await mkdir(outPath, { recursive: true })
			continue
		}

		// regular file ('0' or '\0')
		if (typeflag === '0' || typeflag === '\u0000') {
			await mkdir(path.dirname(outPath), { recursive: true })
			await writeFile(outPath, fileData)
			continue
		}

		// ignore other entry types for now
	}
}

async function tryExtractWithSystemTar(tgzPath: string, destDir: string): Promise<boolean> {
	const tar = (Bun as any).which?.('tar') as string | undefined
	if (!tar) return false

	// Basic path safety check using tar listing. This doesn't cover every tar edge case,
	// but it prevents obvious traversal in file names and keeps behavior consistent
	// with our safeJoin stripping logic.
	const listProc = Bun.spawn([tar, '-tzf', tgzPath], { stdout: 'pipe', stderr: 'pipe' })
	const listText = await new Response(listProc.stdout).text()
	const listCode = await listProc.exited
	if (listCode !== 0) return false

	for (const rawName of listText.split('\n')) {
		const name = rawName.trim()
		if (!name) continue
		const parts = name.replace(/\\/g, '/').split('/').filter(Boolean)
		const rel = parts.length > 1 ? parts.slice(1).join('/') : ''
		if (!rel) continue
		// Validate the *stripped* path, matching extractTarGz's behavior.
		safeJoin(destDir, rel)
	}

	const extractProc = Bun.spawn([tar, '-xzf', tgzPath, '-C', destDir, '--strip-components=1'], {
		stdout: 'pipe',
		stderr: 'pipe',
	})
	const stderr = await new Response(extractProc.stderr).text()
	const code = await extractProc.exited
	if (code !== 0) return false
	if (stderr.trim()) process.stderr.write(stderr)
	return true
}

async function extractTemplate(tgzPath: string, destDir: string) {
	if (await tryExtractWithSystemTar(tgzPath, destDir)) return
	const bytes = new Uint8Array(await readFile(tgzPath))
	await extractTarGz(bytes, destDir)
}

function bunCmd(): { cmd: string; env: Record<string, string> } {
	// Prefer system bun; fallback to self with BUN_BE_BUN=1 (works for compiled exes).
	const env = { ...process.env } as Record<string, string>
	const which = (Bun as any).which?.('bun') as string | undefined
	if (which) return { cmd: which, env }
	env.BUN_BE_BUN = '1'
	return { cmd: process.execPath, env }
}

async function run(cmd: string, args: string[], cwd: string, extraEnv?: Record<string, string>) {
	const env = { ...(process.env as any), ...(extraEnv ?? {}) } as Record<string, string>
	const proc = Bun.spawn([cmd, ...args], { cwd, env, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
	const code = await proc.exited
	if (code !== 0) process.exit(code)
}

async function runText(cmd: string, args: string[], cwd: string): Promise<string> {
	const proc = Bun.spawn([cmd, ...args], { cwd, stdout: 'pipe', stderr: 'pipe' })
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	])
	if (code !== 0) {
		const msg = stderr.trim() || stdout.trim() || `${cmd} ${args.join(' ')} failed`
		throw new Error(msg)
	}
	return stdout
}

type SemverParts = [number, number, number]

function parseSemverLikeTag(tag: string): { parts: SemverParts; strict: boolean } | null {
	const raw = tag.trim()
	if (!raw) return null
	const t = raw.startsWith('v') ? raw.slice(1) : raw
	const segments = t.split('.').filter(Boolean)
	if (segments.length < 2) return null

	// Accept numeric dotted tags; if there are extra numeric segments (e.g. v0.1.44.1),
	// normalize by taking the first 3 numbers for comparison.
	const nums: number[] = []
	for (const seg of segments) {
		if (!/^\d+$/.test(seg)) return null
		nums.push(Number(seg))
	}
	while (nums.length < 3) nums.push(0)
	const parts: SemverParts = [nums[0]!, nums[1]!, nums[2]!]
	const strict = segments.length === 3
	return { parts, strict }
}

function compareSemver(a: SemverParts, b: SemverParts): number {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i]
	}
	return 0
}

function formatSemverTag(parts: SemverParts): string {
	return `v${parts[0]}.${parts[1]}.${parts[2]}`
}

function bumpSemver(current: SemverParts, kind: 'patch' | 'minor' | 'major'): SemverParts {
	const [maj, min, pat] = current
	if (kind === 'patch') return [maj, min, pat + 1]
	if (kind === 'minor') return [maj, min + 1, 0]
	return [maj + 1, 0, 0]
}

async function findProjectRoot(startDir: string) {
	let dir = path.resolve(startDir)
	while (true) {
		for (const rel of [
			'dex.config.ts',
			'dex.config.js',
			'dex.config.mjs',
			'dex.config.json',
			'config/dex.config.ts',
			'config/dex.config.js',
			'config/dex.config.mjs',
			'config/dex.config.json',
		]) {
			const p = path.join(dir, rel)
			if (existsSync(p)) return { root: dir, configPath: p }
		}

		const pkgPath = path.join(dir, 'package.json')
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
				if (pkg && typeof pkg === 'object' && pkg.dex) return { root: dir, configPath: pkgPath }
			} catch {
				// ignore
			}
		}

		const parent = path.dirname(dir)
		if (parent === dir) return null
		dir = parent
	}
}

async function loadDexConfig(found: { root: string; configPath: string }): Promise<DexConfig> {
	if (found.configPath.endsWith('package.json')) {
		const pkg = JSON.parse(await readFile(found.configPath, 'utf8'))
		return (pkg.dex ?? {}) as DexConfig
	}
	if (found.configPath.endsWith('.json')) {
		return JSON.parse(await readFile(found.configPath, 'utf8')) as DexConfig
	}
	const { pathToFileURL } = await import('node:url')
	const url = pathToFileURL(found.configPath).href + `?t=${Date.now()}`
	const mod: any = await import(url)
	return (mod?.default ?? mod?.dexConfig ?? {}) as DexConfig
}

async function setPackageName(destDir: string) {
	const pkgPath = path.join(destDir, 'package.json')
	if (!existsSync(pkgPath)) return
	try {
		const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
		pkg.name = pkg.name && pkg.name !== 'dex-starter' ? pkg.name : path.basename(destDir)
		await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
	} catch {
		// ignore
	}
}

async function updateDexPackageVersions(destDir: string, versions: Record<string, string>) {
	const pkgPath = path.join(destDir, 'package.json')
	if (!existsSync(pkgPath)) return
	try {
		const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
		const dex = pkg.dex && typeof pkg.dex === 'object' ? pkg.dex : {}
		dex.packageVersions = { ...(dex.packageVersions ?? {}), ...versions }
		pkg.dex = dex
		await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
	} catch {
		// ignore
	}
}

async function writeDexMetadata(destDir: string, templateVersion: string, templateTag: string) {
	const dexDir = path.join(destDir, '.dex')
	await mkdir(dexDir, { recursive: true })
	const metadata: DexMetadata = {
		version: templateVersion,
		releaseTag: templateTag,
		syncedAt: new Date().toISOString(),
	}
	await writeFile(path.join(dexDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n')
}

async function writePackagesIndex(destDir: string, packageDirs: string[]) {
	const packagesDir = path.join(destDir, 'packages')
	await mkdir(packagesDir, { recursive: true })
	const lines = packageDirs.map((p) => `export * from './${p}/src/index'`)
	await writeFile(path.join(packagesDir, 'index.ts'), lines.join('\n') + '\n')
}

function findAnyExisting(baseDir: string, rels: string[]) {
	for (const rel of rels) {
		const p = path.join(baseDir, rel)
		if (existsSync(p)) return p
	}
	return null
}

function runScaffoldChecks(destDir: string, packageDirs: string[]) {
	const warnings: string[] = []
	const pkgJson = path.join(destDir, 'package.json')
	if (!existsSync(pkgJson)) warnings.push('Missing package.json in project root.')

	const dexConfig = findAnyExisting(destDir, [
		'dex.config.ts',
		'dex.config.js',
		'dex.config.mjs',
		'dex.config.json',
		'config/dex.config.ts',
		'config/dex.config.js',
		'config/dex.config.mjs',
		'config/dex.config.json',
	])
	if (!dexConfig) warnings.push('Missing dex.config.* (or config/dex.config.*).')

	const packagesDir = path.join(destDir, 'packages')
	if (!existsSync(packagesDir)) warnings.push('Missing packages/ directory.')

	for (const pkg of packageDirs) {
		const p = path.join(destDir, 'packages', pkg, 'package.json')
		if (!existsSync(p)) warnings.push(`Missing packages/${pkg}/package.json.`)
	}

	return warnings
}

async function cmdScaffold(dirArg: string, flags: Record<string, string | boolean>) {
	const step = createSteps()

	const destDir = await step('Prepare destination directory', async () => {
		const resolved = path.resolve(dirArg)
		await mkdir(resolved, { recursive: true })
		const contents = await readdir(resolved)
		if (contents.length > 0) throw new Error(`Destination is not empty: ${resolved}`)
		return resolved
	})

	const mode = await step('Choose project type', async () => {
		return (await promptSelect('Choose project type', ['spa', 'mpa'])) as Mode
	})

	const assetName = mode === 'spa' ? 'dex-template-spa.tgz' : 'dex-template-mpa.tgz'
	const localTemplate = templatePathFromEnvOrFlag(flags)
	const templateUrl = templateUrlFromEnvOrFlag(flags)

	const template = await step(`Resolve template (${assetName})`, async () => {
		if (localTemplate) {
			if (!existsSync(localTemplate)) throw new Error(`Template not found: ${localTemplate}`)
			process.stdout.write(`   template source: local (${localTemplate})\n`)
			return { path: localTemplate, source: 'local' as const }
		}

		if (templateUrl) {
			const { path: p, cache } = await getTemplateTgzPathFromUrl(templateUrl)
			process.stdout.write(`   template source: url (${templateUrl})\n`)
			process.stdout.write(`   template cache: ${cache}\n`)
			return { path: p, source: 'url' as const }
		}

		const repo = repoFromEnvOrFlag(flags)
		const tag = (flags.tag as string | undefined) ?? 'latest'
		try {
			const { path: p, cache } = await getTemplateTgzPath(repo, tag, assetName)
			process.stdout.write(`   template source: github (${repo}@${tag})\n`)
			process.stdout.write(`   template cache: ${cache}\n`)
			return { path: p, source: 'github' as const, repo, tag }
		} catch (err: any) {
			const msg = err?.message ?? String(err)
			if (String(msg).includes('Request timed out')) {
				throw new Error(
					`${msg}\n\nGitHub release asset downloads are timing out. This is often caused by a network policy blocking github.com downloads.\n` +
					`Workarounds:\n` +
					`- Provide a local template: --template /path/to/${assetName}  (or set DEX_TEMPLATE_TGZ)\n` +
					`- Provide a direct URL: --template-url https://.../${assetName} (or set DEX_TEMPLATE_URL)\n` +
					`- Increase timeout: set DEX_FETCH_TIMEOUT_MS=60000\n` +
					`- If you hit rate limits, set GITHUB_TOKEN`
				)
			}
			throw err
		}
	})

	await step('Extract template', async () => {
		await extractTemplate(template.path, destDir)
	})

	await step('Finalize project files', async () => {
		await setPackageName(destDir)
	})

	await step('Fetch framework packages', async () => {
		const repo =
			packageRepoFromEnvOrFlag(flags) ??
			(template.source === 'github' ? template.repo : null)
		if (!repo) {
			throw new Error(
				'Missing package repo. Set DEX_PACKAGE_REPO (or pass --packages-repo) to fetch dex-package-*.tgz assets.'
			)
		}
		const tag =
			packageTagFromEnvOrFlag(flags) ??
			(template.source === 'github' ? template.tag : 'latest')

		const packagesDir = path.join(destDir, 'packages')
		await mkdir(packagesDir, { recursive: true })

		const packageDirs = DEFAULT_PACKAGES
		const versions: Record<string, string> = {}
		for (const pkg of packageDirs) {
			const asset = `dex-package-${pkg}.tgz`
			const { path: p, cache } = await getTemplateTgzPath(repo, tag, asset)
			process.stdout.write(`   package ${pkg}: ${cache} (${asset})\n`)
			const outDir = path.join(packagesDir, pkg)
			await extractTemplate(p, outDir)

			const pkgJsonPath = path.join(outDir, 'package.json')
			if (!existsSync(pkgJsonPath)) continue
			try {
				const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'))
				if (pkgJson?.name && pkgJson?.version) versions[pkgJson.name] = pkgJson.version
			} catch {
				// ignore
			}
		}

		await writePackagesIndex(destDir, packageDirs)
		await updateDexPackageVersions(destDir, versions)

		// Track template version in metadata
		const templateVersion = template.source === 'github' && template.tag ? template.tag : 'unknown'
		await writeDexMetadata(destDir, templateVersion, templateVersion)
	})

	await step('Verify scaffolded files', async () => {
		const warnings = runScaffoldChecks(destDir, DEFAULT_PACKAGES)
		if (warnings.length) {
			process.stderr.write(`\n⚠ Scaffold checks reported issues:\n`)
			for (const w of warnings) process.stderr.write(`  - ${w}\n`)
			process.stderr.write('  (Continuing as requested.)\n')
		}
	})

	if (!flags['no-install']) {
		await step('Install dependencies (bun install)', async () => {
			const { cmd, env } = bunCmd()
			await run(cmd, ['install'], destDir, env)
		})
	} else {
		process.stdout.write(`\nℹ Skipping install (use bun install in ${destDir})\n`)
	}

	console.log(`\nScaffolded ${mode} project in ${destDir}`)
	process.exit(0)
}

async function cmdBuild() {
	const found = await findProjectRoot(process.cwd())
	if (!found) throw new Error('Not in a Dex project (missing dex.config.*)')
	const { cmd, env } = bunCmd()
	await run(cmd, ['run', 'build'], found.root, env)
}

async function cmdStart(prod: boolean) {
	const found = await findProjectRoot(process.cwd())
	if (!found) throw new Error('Not in a Dex project (missing dex.config.*)')
	const cfg = await loadDexConfig(found)

	const { cmd, env } = bunCmd()
	const extraEnv: Record<string, string> = { ...env }
	if (prod) extraEnv.NODE_ENV = 'production'
	if (typeof extraEnv.PORT !== 'string' && typeof cfg.port === 'number') extraEnv.PORT = String(cfg.port)

	if (prod) {
		await run(cmd, ['run', 'start'], found.root, extraEnv)
	} else {
		await run(cmd, ['run', 'dev'], found.root, extraEnv)
	}
}

async function getCliVersion(): Promise<string> {
	// In compiled mode, try to find package.json in common locations
	// The binary could be: /dist/dex (in repo), ~/.bun/bin/dex (installed), or wherever
	const dir = import.meta.url ? path.dirname(import.meta.url.replace('file://', '')) : process.cwd()
	
	const searchPaths = [
		path.resolve(dir, '../../package.json'), // from src/
		path.resolve(dir, '../packages/cli/package.json'), // from framework/dist
		path.resolve(dir, '../framework/packages/cli/package.json'), // from repo dist
		path.resolve(dir, 'package.json'),
		path.join(process.cwd(), 'package.json'),
		'/home/oti/projects/dex/framework/packages/cli/package.json', // dev fallback
	]

	for (const pkgPath of searchPaths) {
		try {
			if (existsSync(pkgPath)) {
				const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
				if (pkg.version) return pkg.version
			}
		} catch {
			// ignore and try next
		}
	}

	return 'unknown'
}

type DexMetadata = {
	version?: string
	syncedAt?: string
	releaseTag?: string
}

async function getTemplateMetadata(): Promise<DexMetadata | null> {
	const metadataPath = path.join(process.cwd(), '.dex', 'metadata.json')
	if (!existsSync(metadataPath)) return null
	try {
		return JSON.parse(await readFile(metadataPath, 'utf8'))
	} catch {
		return null
	}
}

async function cmdVersion(showTemplate: boolean) {
	const cliVersion = await getCliVersion()
	console.log(`dex ${cliVersion}`)

	if (showTemplate) {
		const metadata = await getTemplateMetadata()
		if (!metadata) {
			console.error('Not in a scaffolded Dex project (no .dex/metadata.json found)')
			process.exit(1)
		}
		if (metadata.version) {
			console.log(`template: ${metadata.version}`)
		}
	}
}

async function cmdTag(kind: 'patch' | 'minor' | 'major') {
	const git = ((Bun as any).which?.('git') as string | undefined) ?? 'git'
	const cwd = process.cwd()
	const tagsText = await runText(git, ['tag', '--list', 'v*'], cwd)
	const tags = tagsText
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)

	const parsed = tags
		.map((tag) => {
			const parsed = parseSemverLikeTag(tag)
			return parsed ? { tag, parts: parsed.parts, strict: parsed.strict } : null
		})
		.filter((x): x is { tag: string; parts: SemverParts; strict: boolean } => Boolean(x))

	if (parsed.length === 0) {
		throw new Error('No version tags found (expected tags like v0.1.44)')
	}

	let current = parsed[0]!
	for (const cand of parsed.slice(1)) {
		const cmp = compareSemver(cand.parts, current.parts)
		if (cmp > 0) current = cand
		if (cmp === 0 && cand.strict && !current.strict) current = cand
	}

	const nextParts = bumpSemver(current.parts, kind)
	const nextTag = formatSemverTag(nextParts)

	console.log(`current: ${current.tag}`)
	console.log(`next:    ${nextTag}`)

	const exists = (await runText(git, ['tag', '--list', nextTag], cwd)).trim()
	if (exists) throw new Error(`Tag already exists: ${nextTag}`)

	await run(git, ['tag', nextTag], cwd)
	await run(git, ['push', 'origin', nextTag], cwd)
}

async function main() {
	const argv = process.argv.slice(2)
	const { positional, flags } = parseArgs(argv)
	const cmd = positional[0]

	// Check version first (before help check)
	if (flags.v || flags.version) {
		await cmdVersion(Boolean(flags.f))
		return
	}

	if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') usage(0)

	try {
		if (cmd === 'scaffold') {
			const dir = positional[1]
			if (!dir) usage(1)
			await cmdScaffold(dir, flags)
			return
		}

		if (cmd === 'sync') {
			await cmdSync(flags)
			return
		}

		if (cmd === 'build') {
			await cmdBuild()
			return
		}

		if (cmd === 'start') {
			await cmdStart(Boolean(flags.p))
			return
		}

		if (cmd === 'tag') {
			const kind = positional[1]
			if (kind !== 'patch' && kind !== 'minor' && kind !== 'major') usage(1)
			await cmdTag(kind)
			return
		}

		console.error(`Unknown command: ${cmd}`)
		usage(1)
	} catch (err: any) {
		console.error(err?.message ?? String(err))
		process.exit(1)
	}
}

await main()
