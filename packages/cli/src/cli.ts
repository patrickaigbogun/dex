import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Mode = 'spa' | 'mpa'

type DexConfig = {
	mode?: Mode
	port?: number
}

function usage(exitCode = 0) {
	const out = exitCode === 0 ? console.log : console.error
	out(`dex

Usage:
  dex scaffold <dir>
  dex build
  dex start [-p]

Scaffold options:
  --repo <owner/repo>        GitHub repo containing release templates
  --tag <tag|latest>         Release tag (default: latest)
  --no-install               Do not run bun install

Start options:
  -p                         Production mode (NODE_ENV=production)

Environment:
  DEX_TEMPLATE_REPO          Default template repo (owner/repo)
  GITHUB_TOKEN               Optional GitHub token (avoids rate limits)
`)
	process.exit(exitCode)
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
		if (a === '--no-install') {
			flags['no-install'] = true
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

function repoFromEnvOrFlag(flags: Record<string, string | boolean>): string {
	const repo = (flags.repo as string | undefined) ?? process.env.DEX_TEMPLATE_REPO
	if (!repo || typeof repo !== 'string') {
		throw new Error('Missing template repo. Provide --repo <owner/repo> or set DEX_TEMPLATE_REPO.')
	}
	if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error(`Invalid --repo format: ${repo}`)
	return repo
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

	const res = await fetch(url, { headers })
	if (!res.ok) throw new Error(`Failed to fetch release (${res.status}): ${await res.text()}`)
	return (await res.json()) as any
}

async function download(url: string) {
	const headers: Record<string, string> = {}
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
	const res = await fetch(url, { headers, redirect: 'follow' })
	if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
	return new Uint8Array(await res.arrayBuffer())
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

async function cmdScaffold(dirArg: string, flags: Record<string, string | boolean>) {
	const destDir = path.resolve(dirArg)
	await mkdir(destDir, { recursive: true })
	const contents = await readdir(destDir)
	if (contents.length > 0) throw new Error(`Destination is not empty: ${destDir}`)

	const mode = (await promptSelect('Choose project type', ['spa', 'mpa'])) as Mode
	const repo = repoFromEnvOrFlag(flags)
	const tag = (flags.tag as string | undefined) ?? 'latest'
	const assetName = mode === 'spa' ? 'dex-template-spa.tgz' : 'dex-template-mpa.tgz'

	const rel = await githubRelease(repo, tag)
	const asset = (rel.assets as any[])?.find((a) => a?.name === assetName)
	if (!asset) {
		const names = ((rel.assets as any[]) ?? []).map((a) => a?.name).filter(Boolean)
		throw new Error(`Missing release asset ${assetName}. Available: ${names.join(', ') || '(none)'}`)
	}

	const bytes = await download(asset.browser_download_url)
	await extractTarGz(bytes, destDir)
	await setPackageName(destDir)

	if (!flags['no-install']) {
		const { cmd, env } = bunCmd()
		await run(cmd, ['install'], destDir, env)
	}

	console.log(`Scaffolded ${mode} project in ${destDir}`)
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

async function main() {
	const argv = process.argv.slice(2)
	const { positional, flags } = parseArgs(argv)
	const cmd = positional[0]

	if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') usage(0)

	try {
		if (cmd === 'scaffold') {
			const dir = positional[1]
			if (!dir) usage(1)
			await cmdScaffold(dir, flags)
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

		console.error(`Unknown command: ${cmd}`)
		usage(1)
	} catch (err: any) {
		console.error(err?.message ?? String(err))
		process.exit(1)
	}
}

await main()
