import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export type DexConfig = {
	mode?: string
	port?: number
	renderStrategy?: 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'
	subdomains?: Record<string, string>
	fonts?: Record<string, any>

	// Router generation paths (current naming)
	pagesDir?: string
	layoutsDir?: string
	outRoutesTs?: string
	outRoutesJson?: string
	outLayoutsTs?: string

	// API / Pie generation config
	apiSpec?: string
	apiUrl?: string
	outApiTs?: string
	apiPrefix?: string
}

const CONFIG_FILENAMES = [
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
]

function normalizeRouterConfig(raw: any): DexConfig {
	const router = raw?.router ?? {}
	const api = raw?.api ?? {}
	const server = raw?.server ?? {}
	return {
		...raw,
		port: raw?.port ?? server.port,
		pagesDir: raw?.pagesDir ?? router.pagesDir,
		layoutsDir: raw?.layoutsDir ?? router.layoutsDir,
		outRoutesTs: raw?.outRoutesTs ?? router.outRoutesTs,
		outRoutesJson: raw?.outRoutesJson ?? router.outRoutesJson,
		outLayoutsTs: raw?.outLayoutsTs ?? router.outLayoutsTs,
		apiSpec: raw?.apiSpec ?? api.spec ?? api.apiSpec,
		apiUrl: raw?.apiUrl ?? api.url ?? api.apiUrl,
		outApiTs: raw?.outApiTs ?? api.outTs ?? api.outApiTs,
		apiPrefix: raw?.apiPrefix ?? api.prefix ?? api.apiPrefix,
	}
}

const cachedConfigs = new Map<string, { config: DexConfig; root: string }>()

export async function loadDexConfig(startDir = process.cwd()): Promise<{ config: DexConfig; root: string }> {
	const resolvedStartDir = path.resolve(startDir)
	const cached = cachedConfigs.get(resolvedStartDir)
	if (cached) return cached

	let dir = resolvedStartDir
	const seen = new Set<string>()

	while (!seen.has(dir)) {
		seen.add(dir)

		for (const filename of CONFIG_FILENAMES) {
			const candidate = path.join(dir, filename)
			if (existsSync(candidate)) {
				try {
					let raw: any
					if (candidate.endsWith('.json')) {
						raw = JSON.parse(readFileSync(candidate, 'utf8'))
					} else {
						const mod: any = await import(pathToFileURL(candidate).href)
						raw = mod?.default ?? mod?.dexConfig ?? mod?.config ?? mod ?? {}
					}
					const config: DexConfig = normalizeRouterConfig(raw)
					const result = { config, root: dir }
					cachedConfigs.set(resolvedStartDir, result)
					return result
				} catch (err) {
					console.warn(`[dex-router] failed to load config at ${candidate}:`, err)
				}
			}
		}

		const parent = path.dirname(dir)
		if (parent === dir) break
		dir = parent
	}

	// No config found: use startDir as root, empty config
	const result = { config: {}, root: resolvedStartDir }
	cachedConfigs.set(resolvedStartDir, result)
	return result
}

export const DEFAULT_PATHS = {
	pagesDir: 'web/pages',
	layoutsDir: 'web/layouts',
	outRoutesTs: '.dex/generated/routes.ts',
	outRoutesJson: '.dex/generated/manifest.json',
	outLayoutsTs: '.dex/generated/layouts.ts',
	outApiTs: '.dex/generated/api.ts',
	apiPrefix: '/api',
} as const

export function resolveFromRoot(root: string, input: string): string {
	return path.resolve(root, input)
}
