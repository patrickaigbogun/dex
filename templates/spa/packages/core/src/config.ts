import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DexPlugin } from './plugins'

export type DexRenderStrategy = 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'

export type DexRouterConfig = {
	pagesDir?: string
	layoutsDir?: string
	outRoutesTs?: string
	outRoutesJson?: string
	outLayoutsTs?: string
}

export type DexServerConfig = {
	port?: number
	trustProxy?: boolean
	allowedHosts?: string[]
	watchFiles?: string[]
	watchDirs?: string[]
}

export type DexApiConfig = {
	spec?: string
	url?: string
	outTs?: string
	prefix?: string
	apiSpec?: string
	apiUrl?: string
	outApiTs?: string
	apiPrefix?: string
}

export type DexBuildConfig = {
	outDir?: string
	target?: string
	minify?: boolean
	splitting?: boolean
	sourcemap?: boolean | 'inline' | 'external' | 'linked' | 'none'
}

export type DexCoreConfig = {
	mode?: string
	port?: number
	renderStrategy?: DexRenderStrategy
	router?: DexRouterConfig
	server?: DexServerConfig
	api?: DexApiConfig
	build?: DexBuildConfig
	subdomains?: Record<string, string>
	fonts?: Record<string, any>
	plugins?: DexPlugin[]

	// Flat compatibility fields
	pagesDir?: string
	layoutsDir?: string
	outRoutesTs?: string
	outRoutesJson?: string
	outLayoutsTs?: string

	apiSpec?: string
	apiUrl?: string
	outApiTs?: string
	apiPrefix?: string

	// Dev watch compatibility fields
	watchFiles?: string[]
	watchDirs?: string[]
	devWatchFiles?: string[]
	devWatchDirs?: string[]
}

const CORE_CONFIG_CANDIDATES = [
	'config/core/index.ts',
	'config/core/index.js',
	'config/core/index.mjs',
	'config/core/index.json',
	'dex.config.ts',
	'dex.config.js',
	'dex.config.mjs',
	'dex.config.json',
	'dex.config.cjs',
	'config/dex.config.ts',
	'config/dex.config.js',
	'config/dex.config.mjs',
	'config/dex.config.json',
	'config/dex.config.cjs',
] as const

/** Define a full Dex project configuration. */
export function defineConfig(config: DexCoreConfig): DexCoreConfig {
	return config
}

/** Define router-specific configuration. */
export function defineRouterConfig(config: DexRouterConfig): DexRouterConfig {
	return config
}

/** Define server-specific configuration. */
export function defineServerConfig(config: DexServerConfig): DexServerConfig {
	return config
}

/** Define API / Pie codegen configuration. */
export function defineApiConfig(config: DexApiConfig): DexApiConfig {
	return config
}

/** Define build-specific configuration. */
export function defineBuildConfig(config: DexBuildConfig): DexBuildConfig {
	return config
}

function normalizeConfig(raw: DexCoreConfig): DexCoreConfig {
	const port = raw.port ?? raw.server?.port
	const pagesDir = raw.pagesDir ?? raw.router?.pagesDir
	const layoutsDir = raw.layoutsDir ?? raw.router?.layoutsDir
	const outRoutesTs = raw.outRoutesTs ?? raw.router?.outRoutesTs
	const outRoutesJson = raw.outRoutesJson ?? raw.router?.outRoutesJson
	const outLayoutsTs = raw.outLayoutsTs ?? raw.router?.outLayoutsTs

	const apiSpec = raw.apiSpec ?? raw.api?.spec ?? raw.api?.apiSpec
	const apiUrl = raw.apiUrl ?? raw.api?.url ?? raw.api?.apiUrl
	const outApiTs = raw.outApiTs ?? raw.api?.outTs ?? raw.api?.outApiTs
	const apiPrefix = raw.apiPrefix ?? raw.api?.prefix ?? raw.api?.apiPrefix

	const watchFiles = raw.watchFiles ?? raw.devWatchFiles ?? raw.server?.watchFiles
	const watchDirs = raw.watchDirs ?? raw.devWatchDirs ?? raw.server?.watchDirs

	const router: DexRouterConfig = {
		...raw.router,
		...(pagesDir !== undefined ? { pagesDir } : {}),
		...(layoutsDir !== undefined ? { layoutsDir } : {}),
		...(outRoutesTs !== undefined ? { outRoutesTs } : {}),
		...(outRoutesJson !== undefined ? { outRoutesJson } : {}),
		...(outLayoutsTs !== undefined ? { outLayoutsTs } : {}),
	}

	const server: DexServerConfig = {
		...raw.server,
		...(port !== undefined ? { port } : {}),
		...(watchFiles !== undefined ? { watchFiles } : {}),
		...(watchDirs !== undefined ? { watchDirs } : {}),
	}

	const api: DexApiConfig = {
		...raw.api,
		...(apiSpec !== undefined ? { spec: apiSpec } : {}),
		...(apiUrl !== undefined ? { url: apiUrl } : {}),
		...(outApiTs !== undefined ? { outTs: outApiTs } : {}),
		...(apiPrefix !== undefined ? { prefix: apiPrefix } : {}),
	}

	const build: DexBuildConfig = {
		...raw.build,
	}

	return {
		...raw,
		...(port !== undefined ? { port } : {}),
		...(pagesDir !== undefined ? { pagesDir } : {}),
		...(layoutsDir !== undefined ? { layoutsDir } : {}),
		...(outRoutesTs !== undefined ? { outRoutesTs } : {}),
		...(outRoutesJson !== undefined ? { outRoutesJson } : {}),
		...(outLayoutsTs !== undefined ? { outLayoutsTs } : {}),
		...(apiSpec !== undefined ? { apiSpec } : {}),
		...(apiUrl !== undefined ? { apiUrl } : {}),
		...(outApiTs !== undefined ? { outApiTs } : {}),
		...(apiPrefix !== undefined ? { apiPrefix } : {}),
		...(watchFiles !== undefined ? { watchFiles } : {}),
		...(watchDirs !== undefined ? { watchDirs } : {}),
		router,
		server,
		api,
		build,
	}
}

/**
 * Load and normalize the project's Dex configuration from `rootDir`.
 * Prefers `config/core/index.{ts,js,mjs,json}` before legacy `dex.config.*` and `config/dex.config.*`.
 */
export async function loadProjectConfig(rootDir = process.cwd()): Promise<DexCoreConfig> {
	const resolvedRoot = path.resolve(rootDir)

	for (const rel of CORE_CONFIG_CANDIDATES) {
		const candidate = path.join(resolvedRoot, rel)
		if (!existsSync(candidate)) continue

		try {
			if (candidate.endsWith('.json')) {
				const raw = JSON.parse(readFileSync(candidate, 'utf8')) as DexCoreConfig
				return normalizeConfig(raw ?? {})
			}
			const mod: any = await import(`${pathToFileURL(candidate).href}?t=${Date.now()}`)
			const raw: DexCoreConfig = mod?.default ?? mod?.dexConfig ?? mod?.config ?? mod ?? {}
			return normalizeConfig(raw)
		} catch (err) {
			console.warn(`[@dex/core] failed to load config at ${candidate}:`, err)
		}
	}

	return normalizeConfig({})
}
