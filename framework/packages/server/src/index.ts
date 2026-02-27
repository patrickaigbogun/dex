import path from 'node:path'
import { statSync, watch, watchFile } from 'node:fs'
import { Elysia } from 'elysia'

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
 */
export function dexDevReloadRouter(opts?: { watchFiles?: string[]; pollIntervalMs?: number }) {
	const isProd = process.env.NODE_ENV === 'production'
	const pollIntervalMs = opts?.pollIntervalMs ?? 250
	const watchFiles = opts?.watchFiles ?? ['web/public/assets/client.js', 'web/public/assets/styles.css']

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

		// Directory watch (best effort)
		try {
			watch('web/public/assets', (_event, filename) => {
				if (typeof filename !== 'string') {
					broadcastReload()
					return
				}
				if (filename.endsWith('.js') || filename.endsWith('.css')) broadcastReload()
			})
		} catch {
			// ignore
		}

		for (const file of watchFiles) {
			try {
				watchFile(file, { interval: 200 }, () => broadcastReload())
			} catch {
				// ignore
			}
		}

		if (!devPollStarted) {
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
export function dexSpaFallback(opts: { indexHtmlPath: string; ssgDir?: string }) {
	return new Elysia().get('*', ({ request }) => {
		if (request.method !== 'GET') return

		const url = new URL(request.url)
		if (url.pathname.startsWith('/api/')) return
		if (url.pathname.startsWith('/assets/')) return
		if (url.pathname.startsWith('/__dev/')) return
		if (url.pathname.includes('.')) return

		const accept = request.headers.get('accept') ?? ''
		if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return

		if (opts.ssgDir) {
			const rel = url.pathname.replace(/^\/+/, '')
			const normalized = path.posix.normalize('/' + rel).slice(1)
			if (normalized.startsWith('..') || normalized.includes('..')) return

			const ssgIndex = normalized
				? path.join(opts.ssgDir, normalized, 'index.html')
				: path.join(opts.ssgDir, 'index.html')
			try {
				if (statSync(ssgIndex).isFile()) return Bun.file(ssgIndex)
			} catch {
				// ignore and fall back to SPA shell
			}
		}

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
