import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Elysia } from 'elysia'
import {
	dexAssetsRoute,
	dexDevReloadRouter,
	dexPrettyLogger,
	dexSpaFallback,
	findAvailablePort,
} from '@dex/server'
import { loadProjectConfig } from './config'
import { runPluginHook } from './plugins'

const API_ENTRY_CANDIDATES = [
	'routes/api/index.ts',
	'routes/api/index.js',
	'routes/api.ts',
	'routes/api.js',
] as const

function resolveApiEntry(rootDir: string): string | null {
	for (const rel of API_ENTRY_CANDIDATES) {
		const abs = path.join(rootDir, rel)
		if (existsSync(abs)) return abs
	}
	return null
}

/**
 * Compose the Elysia dev server for a Dex project with opt-in API and frontend mounting.
 */
export async function createDevServer(rootDir = process.cwd()): Promise<any> {
	const resolvedRoot = path.resolve(rootDir)
	const config = await loadProjectConfig(resolvedRoot)

	let app: any = new Elysia().use(dexPrettyLogger({ ignore: (p) => p === '/__dev/reload' }))

	const apiEntry = resolveApiEntry(resolvedRoot)
	if (apiEntry) {
		const apiMod: any = await import(pathToFileURL(apiEntry).href)
		const apiRoutes = apiMod?.apiRoutes ?? apiMod?.default
		const apiPrefix = config.apiPrefix ?? config.api?.prefix ?? '/api'
		if (typeof apiRoutes === 'function') {
			app = app.group(apiPrefix, (api: any) => api.use(apiRoutes()))
		} else if (apiRoutes) {
			app = app.group(apiPrefix, (api: any) => api.use(apiRoutes))
		}
	}

	const apiOnly = process.env.DEX_API_ONLY === '1' || process.env.DEX_API_ONLY === 'true'
	const indexHtmlPath = path.join(resolvedRoot, 'web', 'public', 'index.html')
	const assetsDir = path.join(resolvedRoot, 'web', 'public', 'assets')

	if (!apiOnly && existsSync(indexHtmlPath)) {
		const watchFiles = (
			config.watchFiles && config.watchFiles.length > 0
				? config.watchFiles
				: ['web/public/assets/client.js', 'web/public/assets/styles.css']
		).map((p) => path.resolve(resolvedRoot, p))

		const watchDirs = (
			config.watchDirs && config.watchDirs.length > 0
				? config.watchDirs
				: ['web/public/assets']
		).map((p) => path.resolve(resolvedRoot, p))

		app = app
			.use(dexAssetsRoute({ assetsDir }))
			.use(dexDevReloadRouter({ watchFiles, watchDirs }))
			.use(
				dexSpaFallback({
					indexHtmlPath,
					subdomains: config.subdomains ?? {},
					fonts: config.fonts ?? {},
					trustProxy: config.server?.trustProxy,
					allowedHosts: config.server?.allowedHosts,
				})
			)
	}

	app = await runPluginHook(config.plugins, 'onServer', app, { rootDir: resolvedRoot, mode: 'dev' })
	return app
}

/**
 * Create and start listening with the Dex dev server on an available port.
 */
export async function startDevServer(rootDir = process.cwd()): Promise<any> {
	const resolvedRoot = path.resolve(rootDir)
	const config = await loadProjectConfig(resolvedRoot)
	const app = await createDevServer(resolvedRoot)

	const basePort = Number(process.env.PORT ?? config.port ?? config.server?.port ?? 7990)
	if (!Number.isFinite(basePort) || basePort <= 0) {
		throw new Error(`Invalid PORT: ${process.env.PORT ?? config.port}`)
	}

	const port = await findAvailablePort(basePort)
	if (port !== basePort) {
		console.log(`Port ${basePort} is in use. Using ${port} instead.`)
	}

	app.listen({ port, reusePort: false })
	console.log(`Dex dev server running at http://${app.server?.hostname ?? 'localhost'}:${app.server?.port ?? port}`)
	return app
}

if (import.meta.main) {
	await startDevServer(process.cwd())
}
