import { Elysia } from 'elysia'
import { statSync, watch, watchFile } from 'node:fs'

const isProd = process.env.NODE_ENV === 'production'

type SSEClient = {
	controller: ReadableStreamDefaultController<Uint8Array>
}

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

	// Watch built assets; when they change, instruct the browser to reload.
	const assetsDir = 'web/public/assets'
	try {
		watch(assetsDir, (_event, filename) => {
			// On some platforms `filename` can be null/undefined. In dev, it's fine to
			// reload on any asset directory change.
			if (typeof filename !== 'string') {
				broadcastReload()
				return
			}
			if (filename.endsWith('.js') || filename.endsWith('.css')) broadcastReload()
		})
	} catch {
		// ignore
	}

	// Polling fallback (more reliable across Bun/platforms).
	for (const file of ['web/public/assets/client.js', 'web/public/assets/styles.css']) {
		try {
			watchFile(file, { interval: 200 }, () => broadcastReload())
		} catch {
			// ignore
		}
	}

	// Bun/platform-safe polling loop (mtime-based).
	if (!devPollStarted) {
		devPollStarted = true
		const files = ['web/public/assets/client.js', 'web/public/assets/styles.css']
		for (const file of files) {
			try {
				devMtimeMs.set(file, statSync(file).mtimeMs)
			} catch {
				// ignore
			}
		}
		setInterval(() => {
			for (const file of files) {
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
		}, 250)
	}
}

export const devReloadRouter = new Elysia().get('/__dev/reload', () => {
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

export const clientRouter = new Elysia().get('*', ({ request }) => {
		if (request.method !== 'GET') return

		const url = new URL(request.url)

		// Let API routes and asset-like paths fall through (API is mounted before this).
		if (url.pathname.startsWith('/api/')) return
		if (url.pathname.startsWith('/assets/')) return
		if (url.pathname.startsWith('/__dev/')) return
		if (url.pathname.includes('.')) return

		const accept = request.headers.get('accept') ?? ''
		if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return

		return Bun.file('web/public/index.html')
	})
