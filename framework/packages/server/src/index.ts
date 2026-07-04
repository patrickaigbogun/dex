import path from 'node:path'
import { statSync, watch, watchFile, existsSync } from 'node:fs'
import { Elysia } from 'elysia'

const CONFIG_FILENAMES = ['dex.config.ts', 'dex.config.js', 'dex.config.mjs', 'dex.config.cjs']

async function loadProjectRootAndConfig() {
	let dir = path.resolve(process.cwd())
	const seen = new Set<string>()

	while (!seen.has(dir)) {
		seen.add(dir)
		for (const filename of CONFIG_FILENAMES) {
			const candidate = path.join(dir, filename)
			if (existsSync(candidate)) {
				try {
					const mod = await import(candidate)
					const cfg = mod.default ?? mod ?? {}
					return { root: dir, config: cfg }
				} catch {}
			}
		}
		const parent = path.dirname(dir)
		if (parent === dir) break
		dir = parent
	}
	return { root: path.resolve(process.cwd()), config: {} as any }
}

const { root: projectRoot, config: dexConfig } = await loadProjectRootAndConfig()

const DEFAULT_DEV_WATCH_FILES = [
	'web/public/assets/client.js',
	'web/public/assets/styles.css',
].map((p) => path.resolve(projectRoot, p))

const DEFAULT_DEV_WATCH_DIRS = [
	'web/public/assets',
].map((p) => path.resolve(projectRoot, p))

type PrettyLogLevel = 'info' | 'error'

/**
 * Serve static assets from a directory at `/assets/*`.
 */
export function dexAssetsRoute(opts: {
	assetsDir: string
	cacheControlProd?: string
	cacheControlDev?: string
}) {
	const isProd = process.env.NODE_ENV === 'production'
	const cacheControlProd = opts.cacheControlProd ?? 'public, max-age=31536000, immutable'
	const cacheControlDev = opts.cacheControlDev ?? 'no-store'

	return new Elysia().get('/assets/*', ({ request, set }) => {
		const url = new URL(request.url)
		const rel = url.pathname.replace(/^\/assets\//, '')
		const normalized = path.posix.normalize('/' + rel).slice(1)
		if (!normalized || normalized.startsWith('..') || normalized.includes('..')) {
			set.status = 400
			return 'Bad asset path'
		}

		const filePath = path.join(opts.assetsDir, normalized)
		set.headers['cache-control'] = isProd ? cacheControlProd : cacheControlDev
		return Bun.file(filePath)
	})
}

type SSEClient = {
	controller: ReadableStreamDefaultController<Uint8Array>
}

/**
 * Dev-only SSE endpoint for triggering a client reload.
 *
 * Resolution order for watch paths:
 *   1. Values passed in opts (highest)
 *   2. Values from dex.config.* (nearest to cwd, using its dir as project root)
 *   3. Built-in defaults (web/public/assets/* resolved relative to project root)
 *
 * Always has a fallback. Paths are relative to the dex.config location.
 */
function resolveList(base: string, list?: string[]) {
	if (!list || list.length === 0) return []
	return list.map((p) => path.resolve(base, p))
}

export function dexDevReloadRouter(opts?: {
	watchFiles?: string[]
	watchDirs?: string[]
	pollIntervalMs?: number
}) {
	const isProd = process.env.NODE_ENV === 'production'
	const pollIntervalMs = opts?.pollIntervalMs ?? 250

	// Precedence: explicit opts > values from dex.config > defaults (all relative to project root from config location)
	const configWatchFiles = (dexConfig as any)?.watchFiles ?? (dexConfig as any)?.devWatchFiles
	const configWatchDirs = (dexConfig as any)?.watchDirs ?? (dexConfig as any)?.devWatchDirs

	const fromUserFiles = resolveList(projectRoot, opts?.watchFiles)
	const fromConfigFiles = resolveList(projectRoot, configWatchFiles)
	const watchFiles = fromUserFiles.length > 0
		? fromUserFiles
		: (fromConfigFiles.length > 0 ? fromConfigFiles : DEFAULT_DEV_WATCH_FILES)

	const fromUserDirs = resolveList(projectRoot, opts?.watchDirs)
	const fromConfigDirs = resolveList(projectRoot, configWatchDirs)
	const watchDirs = fromUserDirs.length > 0
		? fromUserDirs
		: (fromConfigDirs.length > 0 ? fromConfigDirs : DEFAULT_DEV_WATCH_DIRS)

	const sseClients = new Set<SSEClient>()
	let devWatcherStarted = false
	let lastReloadAt = 0
	let devPollStarted = false
	const devMtimeMs = new Map<string, number>()

	function broadcastReload() {
		const now = Date.now()
		if (now - lastReloadAt < 100) return
		lastReloadAt = now

		const encoder = new TextEncoder()
		const payload = encoder.encode(`event: reload\ndata: now\n\n`)
		for (const c of sseClients) {
			try {
				c.controller.enqueue(payload)
			} catch {
				sseClients.delete(c)
			}
		}
	}

	function ensureDevWatcher() {
		if (isProd || devWatcherStarted) return
		devWatcherStarted = true

		// Directory watches - only from explicit or defaults (no hard-coded strings)
		for (const dir of watchDirs) {
			try {
				watch(dir, (_event, filename) => {
					if (typeof filename !== 'string') {
						broadcastReload()
						return
					}
					if (filename.endsWith('.js') || filename.endsWith('.css')) broadcastReload()
				})
			} catch {
				// ignore
			}
		}

		for (const file of watchFiles) {
			try {
				watchFile(file, { interval: 200 }, () => broadcastReload())
			} catch {
				// ignore
			}
		}

		if (!devPollStarted && watchFiles.length > 0) {
			devPollStarted = true
			for (const file of watchFiles) {
				try {
					devMtimeMs.set(file, statSync(file).mtimeMs)
				} catch {
					// ignore
				}
			}
			setInterval(() => {
				for (const file of watchFiles) {
					let mtimeMs: number | undefined
					try {
						mtimeMs = statSync(file).mtimeMs
					} catch {
						continue
					}

					const prev = devMtimeMs.get(file)
					devMtimeMs.set(file, mtimeMs)
					if (prev !== undefined && mtimeMs !== prev) broadcastReload()
				}
			}, pollIntervalMs)
		}
	}

	return new Elysia().get('/__dev/reload', () => {
		if (isProd) return new Response('Not found', { status: 404 })
		ensureDevWatcher()

		let client: SSEClient | undefined
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				client = { controller }
				sseClients.add(client)
				controller.enqueue(new TextEncoder().encode(`retry: 250\n\n`))
			},
			cancel() {
				if (client) sseClients.delete(client)
			},
		})

		return new Response(stream, {
			headers: {
				'content-type': 'text/event-stream',
				'cache-control': 'no-store',
				connection: 'keep-alive',
			},
		})
	})
}

/**
 * SPA fallback that serves the index HTML for non-asset GET requests.
 */
export function dexSpaFallback(opts: { indexHtmlPath: string }) {
	return new Elysia().get('*', ({ request }) => {
		if (request.method !== 'GET') return

		const url = new URL(request.url)
		if (url.pathname.startsWith('/api/')) return
		if (url.pathname.startsWith('/assets/')) return
		if (url.pathname.startsWith('/__dev/')) return
		if (url.pathname.includes('.')) return

		const accept = request.headers.get('accept') ?? ''
		if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return

		return Bun.file(opts.indexHtmlPath)
	})
}

function shouldUseColor() {
	if (process.env.NO_COLOR) return false
	if (process.env.NODE_ENV === 'production') return false
	return Boolean(process.stdout.isTTY)
}

function formatPrefix(level: PrettyLogLevel, useColor: boolean) {
	const ts = new Date().toISOString()
	if (!useColor) return `[${ts}]`

	const dim = '\x1b[2m'
	const reset = '\x1b[0m'
	const levelColor = level === 'error' ? '\x1b[31m' : '\x1b[36m'
	return `${dim}[${ts}]${reset} ${levelColor}${level.toUpperCase()}${reset}`
}

function formatStatus(status: number, useColor: boolean) {
	if (!useColor) return String(status)
	const reset = '\x1b[0m'
	const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
	return `${color}${status}${reset}`
}

/**
 * Pretty request logger for Elysia apps.
 */
export function dexPrettyLogger(opts?: {
	ignore?: (pathname: string) => boolean
	includeQuery?: boolean
}) {
	const useColor = shouldUseColor()
	const includeQuery = opts?.includeQuery ?? false
	const starts = new WeakMap<Request, number>()

	// Use a function-plugin so hooks attach to the parent app.
	return (app: Elysia) =>
		app
			.onRequest(({ request }) => {
				starts.set(request, performance.now())
			})
			.onAfterResponse(({ request, set }) => {
				const url = new URL(request.url)
				if (opts?.ignore?.(url.pathname)) return

				const start = starts.get(request)
				const ms = start === undefined ? undefined : Math.max(0, performance.now() - start)
				const status = typeof set.status === 'number' ? set.status : 200
				const pathWithQuery = includeQuery ? `${url.pathname}${url.search}` : url.pathname

				const prefix = formatPrefix('info', useColor)
				const statusText = formatStatus(status, useColor)
				const msText = ms === undefined ? '' : ` ${ms.toFixed(1)}ms`
				console.log(`${prefix} ${request.method} ${pathWithQuery} ${statusText}${msText}`)
			})
			.onError(({ request, error, set }) => {
				const url = new URL(request.url)
				if (opts?.ignore?.(url.pathname)) return

				const status = typeof set.status === 'number' ? set.status : 500
				const prefix = formatPrefix('error', useColor)
				const statusText = formatStatus(status, useColor)
				console.error(`${prefix} ${request.method} ${url.pathname} ${statusText}`)
				console.error(error)
			})
}
