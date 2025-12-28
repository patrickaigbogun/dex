import path from 'node:path'
import { statSync, watch, watchFile } from 'node:fs'
import { Elysia } from 'elysia'

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
