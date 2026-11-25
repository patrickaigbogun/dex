import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Elysia } from 'elysia'
import { dexAssetsRoute, dexPrettyLogger, dexSpaFallback, findAvailablePort } from '@dex/server'
import { loadProjectConfig, type DexCoreConfig } from './config'
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

function resolveProdRoot(explicitRootDir?: string): { rootDir: string; compiledBuildDir?: string } {
	if (explicitRootDir) {
		return { rootDir: path.resolve(explicitRootDir) }
	}

	const execBase = path.basename(process.execPath || '')
	const isCompiledBinary = execBase !== '' && execBase !== 'bun' && execBase !== 'bun.exe'
	if (isCompiledBinary) {
		const exeDir = path.dirname(process.execPath)
		if (
			existsSync(path.join(exeDir, 'index.html')) ||
			existsSync(path.join(exeDir, 'assets')) ||
			existsSync(path.join(exeDir, '__ssg'))
		) {
			return { rootDir: path.dirname(exeDir), compiledBuildDir: exeDir }
		}
	}

	return { rootDir: path.resolve(process.cwd()) }
}

export type ProdServerOptions = {
	rootDir?: string
	config?: DexCoreConfig
	apiModule?: any
}

function normalizeProdServerArgs(rootDirOrOpts?: string | ProdServerOptions): ProdServerOptions {
	if (typeof rootDirOrOpts === 'string') {
		return { rootDir: rootDirOrOpts }
	}
	return rootDirOrOpts ?? {}
}

/**
 * Compose the Elysia production server for a Dex project with opt-in API and static build mounting.
 */
export async function createProdServer(rootDirOrOpts?: string | ProdServerOptions): Promise<any> {
	const opts = normalizeProdServerArgs(rootDirOrOpts)
	const resolved = resolveProdRoot(opts.rootDir)
	const resolvedRoot = resolved.rootDir
	const config = opts.config ?? (await loadProjectConfig(resolvedRoot))

	let app: any = new Elysia().use(dexPrettyLogger())

	let apiMod: any = opts.apiModule
	if (!apiMod) {
		const apiEntry = resolveApiEntry(resolvedRoot)
		if (apiEntry) {
			apiMod = await import(pathToFileURL(apiEntry).href)
		}
	}
	if (apiMod) {
		const apiRoutes = apiMod?.apiRoutes ?? apiMod?.default ?? (typeof apiMod === 'function' ? apiMod : undefined)
		const apiPrefix = config.apiPrefix ?? config.api?.prefix ?? '/api'
		if (typeof apiRoutes === 'function') {
			app = app.group(apiPrefix, (api: any) => api.use(apiRoutes()))
		} else if (apiRoutes) {
			app = app.group(apiPrefix, (api: any) => api.use(apiRoutes))
		}
	}

	const apiOnly = process.env.DEX_API_ONLY === '1' || process.env.DEX_API_ONLY === 'true'
	const buildDir = resolved.compiledBuildDir ?? path.resolve(resolvedRoot, config.build?.outDir ?? 'build')
	const assetsDir = path.join(buildDir, 'assets')
	const indexHtmlPath = path.join(buildDir, 'index.html')
	const ssgDir = path.join(buildDir, '__ssg')

	if (!apiOnly && existsSync(assetsDir)) {
		app = app.use(dexAssetsRoute({ assetsDir }))
	}

	if (!apiOnly && existsSync(indexHtmlPath)) {
		app = app.use(
			dexSpaFallback({
				indexHtmlPath,
				ssgDir,
				subdomains: config.subdomains ?? {},
				fonts: config.fonts ?? {},
				trustProxy: config.server?.trustProxy,
				allowedHosts: config.server?.allowedHosts,
			})
		)
	}

	app = await runPluginHook(config.plugins, 'onServer', app, { rootDir: resolvedRoot, mode: 'prod' })
	return app
}

/**
 * Create and start listening with the Dex production server on an available port.
 */
export async function startProdServer(rootDirOrOpts?: string | ProdServerOptions): Promise<any> {
	const opts = normalizeProdServerArgs(rootDirOrOpts)
	const resolved = resolveProdRoot(opts.rootDir)
	const config = opts.config ?? (await loadProjectConfig(resolved.rootDir))
	const app = await createProdServer({ ...opts, config })

	const basePort = Number(process.env.PORT ?? config.port ?? config.server?.port ?? 7990)
	if (!Number.isFinite(basePort) || basePort <= 0) {
		throw new Error(`Invalid PORT: ${process.env.PORT ?? config.port}`)
	}

	const port = await findAvailablePort(basePort)
	if (port !== basePort) {
		console.log(`Port ${basePort} is in use. Using ${port} instead.`)
	}

	app.listen({ port, reusePort: false })
	console.log(`Dex prod server running at http://${app.server?.hostname ?? 'localhost'}:${app.server?.port ?? port}`)
	return app
}

if (import.meta.main) {
	await startProdServer()
}
