import path from 'node:path'
import { statSync, watch, watchFile, existsSync } from 'node:fs'
import { Elysia } from 'elysia'
import { injectGoogleFonts, type DexFontsConfig } from './fonts'

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
		const rawRel = url.pathname.replace(/^\/assets\//, '')
		let decoded = rawRel
		try {
			decoded = decodeURIComponent(rawRel)
		} catch {
			set.status = 400
			return 'Bad asset path'
		}
		if (
			rawRel.includes('\0') ||
			rawRel.includes('\\') ||
			decoded.includes('\0') ||
			decoded.includes('\\') ||
			decoded.split('/').includes('..')
		) {
			set.status = 400
			return 'Bad asset path'
		}
		const normalized = path.posix.normalize('/' + decoded).slice(1)
		if (!normalized || normalized.startsWith('..') || normalized.includes('..')) {
			set.status = 400
			return 'Bad asset path'
		}

		const baseDir = path.resolve(opts.assetsDir)
		const filePath = path.resolve(baseDir, normalized)
		if (!filePath.startsWith(baseDir + path.sep)) {
			set.status = 400
			return 'Bad asset path'
		}
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

export interface DexHeadMeta {
	title?: string | null
	description?: string | null
	ogTitle?: string | null
	ogDescription?: string | null
	ogImage?: string | null
	ogVideo?: string | null
	ogType?: string | null
	url?: string | null
	twitterCard?: 'summary' | 'summary_large_image' | 'player' | null
}

function escapeHtmlAttr(val: string): string {
	return val
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

function escapeHtmlText(val: string): string {
	return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isSafeMetaUrl(val: string): boolean {
	const cleaned = val.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase()
	const m = /^([a-z0-9+.-]+):/.exec(cleaned)
	if (m) {
		return m[1] !== 'javascript' && m[1] !== 'data' && m[1] !== 'vbscript'
	}
	return true
}

/**
 * Inject head title, description, Open Graph, and Twitter metadata into HTML before </head>.
 */
export function injectHeadMeta(html: string, meta: DexHeadMeta): string {
	let out = html
	const title = meta.title || meta.ogTitle
	if (title) {
		const escapedTitle = escapeHtmlText(title)
		if (/<title>[\s\S]*?<\/title>/i.test(out)) {
			out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapedTitle}</title>`)
		} else {
			out = out.replace(/<\/head>/i, () => `<title>${escapedTitle}</title>\n\t</head>`)
		}
	}

	const tags: string[] = []
	const desc = meta.description || meta.ogDescription
	if (desc) {
		tags.push(`<meta name="description" content="${escapeHtmlAttr(desc)}" />`)
		tags.push(`<meta property="og:description" content="${escapeHtmlAttr(desc)}" />`)
		tags.push(`<meta name="twitter:description" content="${escapeHtmlAttr(desc)}" />`)
	}
	const ogTitle = meta.ogTitle || meta.title
	if (ogTitle) {
		tags.push(`<meta property="og:title" content="${escapeHtmlAttr(ogTitle)}" />`)
		tags.push(`<meta name="twitter:title" content="${escapeHtmlAttr(ogTitle)}" />`)
	}
	if (meta.ogType) {
		tags.push(`<meta property="og:type" content="${escapeHtmlAttr(meta.ogType)}" />`)
	}
	if (meta.url && isSafeMetaUrl(meta.url)) {
		tags.push(`<meta property="og:url" content="${escapeHtmlAttr(meta.url)}" />`)
	}
	const safeOgImage = meta.ogImage && isSafeMetaUrl(meta.ogImage) ? meta.ogImage : null
	if (safeOgImage) {
		tags.push(`<meta property="og:image" content="${escapeHtmlAttr(safeOgImage)}" />`)
		tags.push(`<meta name="twitter:image" content="${escapeHtmlAttr(safeOgImage)}" />`)
	}
	if (meta.ogVideo && isSafeMetaUrl(meta.ogVideo)) {
		tags.push(`<meta property="og:video" content="${escapeHtmlAttr(meta.ogVideo)}" />`)
		tags.push(`<meta property="og:video:secure_url" content="${escapeHtmlAttr(meta.ogVideo)}" />`)
		tags.push(`<meta property="og:video:type" content="video/mp4" />`)
	}
	const twitterCard = meta.twitterCard || (safeOgImage ? 'summary_large_image' : 'summary')
	tags.push(`<meta name="twitter:card" content="${escapeHtmlAttr(twitterCard)}" />`)

	if (tags.length > 0) {
		out = out.replace(/<\/head>/i, () => `\t\t${tags.join('\n\t\t')}\n\t</head>`)
	}
	return out
}

function resolveSsgHtmlPath(
	pathname: string,
	indexHtmlPath: string,
	ssgDir?: string
): { targetPath: string; invalid: boolean } {
	if (pathname.includes('\0') || pathname.includes('\\')) {
		return { targetPath: indexHtmlPath, invalid: true }
	}
	let decoded = pathname
	try {
		decoded = decodeURIComponent(pathname)
	} catch {
		return { targetPath: indexHtmlPath, invalid: true }
	}
	if (decoded.includes('\0') || decoded.includes('\\')) {
		return { targetPath: indexHtmlPath, invalid: true }
	}

	const rawSegments = decoded.split(/[\\/]/).filter(Boolean)
	if (rawSegments.some((seg) => seg === '.' || seg === '..')) {
		return { targetPath: indexHtmlPath, invalid: true }
	}

	const normalized = path.posix.normalize('/' + decoded)
	const relPath = normalized.replace(/^\/+|\/+$/g, '')

	if (relPath) {
		const baseDirs: string[] = []
		if (ssgDir) {
			baseDirs.push(ssgDir)
		}
		baseDirs.push(path.dirname(indexHtmlPath))

		for (const baseDir of baseDirs) {
			const resolvedBase = path.resolve(baseDir)
			const candidate = path.resolve(resolvedBase, relPath, 'index.html')
			if (!candidate.startsWith(resolvedBase + path.sep)) {
				return { targetPath: indexHtmlPath, invalid: true }
			}
			if (existsSync(candidate)) {
				return { targetPath: candidate, invalid: false }
			}
		}
	} else if (ssgDir) {
		const resolvedSsg = path.resolve(ssgDir)
		const rootSsg = path.resolve(resolvedSsg, 'index.html')
		if (rootSsg.startsWith(resolvedSsg + path.sep) && existsSync(rootSsg)) {
			return { targetPath: rootSsg, invalid: false }
		}
	}

	return { targetPath: indexHtmlPath, invalid: false }
}

/**
 * SPA fallback that serves prerendered SSG pages or the index HTML for non-asset GET requests.
 */
export function dexSpaFallback(opts: {
	indexHtmlPath: string
	ssgDir?: string
	subdomains?: Record<string, string>
	fonts?: DexFontsConfig
	trustProxy?: boolean
	allowedHosts?: string[]
	resolveHead?: (ctx: {
		pathname: string
		url: URL
		hostname: string
		request: Request
	}) => Promise<DexHeadMeta | null> | DexHeadMeta | null
}) {
	const subdomains: Record<string, string> = opts.subdomains ?? (dexConfig as any)?.subdomains ?? {}
	const fonts: DexFontsConfig | undefined = opts.fonts ?? (dexConfig as any)?.fonts
	const allowedHostsLower = opts.allowedHosts?.map((h) => h.toLowerCase())

	return new Elysia().get('*', async ({ request, set }) => {
		if (request.method !== 'GET') {
			set.status = 405
			return 'Method Not Allowed'
		}

		const url = new URL(request.url)
		if (
			url.pathname.startsWith('/api/') ||
			url.pathname.startsWith('/assets/') ||
			url.pathname.startsWith('/__dev/')
		) {
			set.status = 404
			return 'Not Found'
		}

		const rawSegs = url.pathname.split('/').filter(Boolean)
		let hasTraversal = url.pathname.includes('\0') || url.pathname.includes('\\')
		let lastDecodedSeg = ''
		for (const seg of rawSegs) {
			try {
				const dec = decodeURIComponent(seg)
				if (dec === '.' || dec === '..' || dec.includes('\\') || dec.includes('\0') || dec.includes('/')) {
					hasTraversal = true
					break
				}
				lastDecodedSeg = dec
			} catch {
				hasTraversal = true
				break
			}
		}
		if (hasTraversal) {
			set.status = 400
			return 'Bad Path'
		}
		if (/\.[a-zA-Z0-9]{1,10}$/.test(lastDecodedSeg)) {
			set.status = 404
			return 'Not Found'
		}

		const accept = request.headers.get('accept') ?? ''
		if (accept && !accept.includes('text/html') && !accept.includes('*/*')) {
			set.status = 404
			return 'Not Found'
		}

		const rawProto = opts.trustProxy === true
			? (request.headers.get('x-forwarded-proto') || url.protocol).split(',')[0]!.trim().replace(/:$/, '').toLowerCase()
			: url.protocol.replace(/:$/, '').toLowerCase()
		const proto = rawProto === 'http' || rawProto === 'https' ? rawProto : 'https'

		const rawHostHeader = opts.trustProxy === true
			? (request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host || '')
			: (request.headers.get('host') || url.host || '')
		const hostCandidate = rawHostHeader.split(',')[0]!.trim().toLowerCase()
		const isValidHostHeader =
			hostCandidate.length > 0 &&
			/^[a-z0-9.:\-[\]]+$/.test(hostCandidate) &&
			!hostCandidate.includes('@') &&
			!hostCandidate.includes('/')
		const hostHeader = isValidHostHeader ? hostCandidate : url.host.toLowerCase()

		let hostname = url.hostname.toLowerCase()
		if (isValidHostHeader) {
			try {
				hostname = new URL(`${proto}://${hostHeader}`).hostname.toLowerCase()
			} catch {
				hostname = url.hostname.toLowerCase()
			}
		}

		if (allowedHostsLower && allowedHostsLower.length > 0 && !allowedHostsLower.includes(hostname)) {
			set.status = 403
			return 'Forbidden'
		}

		const isLocal =
			hostname === 'localhost' ||
			hostname === '[::1]' ||
			hostname === '::1' ||
			/^(\d+\.){3}\d+$/.test(hostname) ||
			hostname.includes(':')

		if (!isLocal && hostname) {
			for (const [sub, prefix] of Object.entries(subdomains)) {
				const normPrefix = prefix.endsWith('/') && prefix !== '/' ? prefix.slice(0, -1) : prefix
				const isOnSub = hostname.startsWith(`${sub}.`)
				const matchesPrefix = url.pathname === normPrefix || url.pathname.startsWith(normPrefix + '/')

				if (matchesPrefix) {
					const strippedPath = url.pathname === normPrefix ? '/' : (url.pathname.slice(normPrefix.length) || '/')
					if (isOnSub) {
						return Response.redirect(`${proto}://${hostHeader}${strippedPath}${url.search}`, 308)
					} else if (!hostname.endsWith('.localhost')) {
						const baseHost = hostHeader.replace(/^www\./i, '')
						return Response.redirect(`${proto}://${sub}.${baseHost}${strippedPath}${url.search}`, 308)
					}
				}
			}
		}

		const { targetPath, invalid } = resolveSsgHtmlPath(url.pathname, opts.indexHtmlPath, opts.ssgDir)
		if (invalid) {
			set.status = 400
			return 'Bad Path'
		}

		let meta: DexHeadMeta | null = null
		if (opts.resolveHead) {
			try {
				meta = await opts.resolveHead({
					pathname: url.pathname,
					url,
					hostname,
					request,
				})
			} catch (err) {
				console.warn('dexSpaFallback resolveHead failed:', err)
			}
		}

		const hasFonts = Boolean(fonts && Object.keys(fonts).length > 0)
		if (meta || hasFonts) {
			let html = await Bun.file(targetPath).text()
			if (meta) {
				html = injectHeadMeta(html, meta)
			}
			if (hasFonts) {
				html = injectGoogleFonts(html, fonts)
			}
			return new Response(html, {
				headers: { 'content-type': 'text/html; charset=utf-8' },
			})
		}

		return Bun.file(targetPath)
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

export * from './env'
export * from './port'
export * from './fonts'

