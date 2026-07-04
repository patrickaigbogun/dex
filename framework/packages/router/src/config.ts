import { existsSync } from 'node:fs'
import path from 'node:path'

export type DexConfig = {
	mode?: string
	port?: number

	// Router generation paths (current naming)
	pagesDir?: string
	layoutsDir?: string
	outRoutesTs?: string
	outRoutesJson?: string
	outLayoutsTs?: string
}

const CONFIG_FILENAMES = ['dex.config.ts', 'dex.config.js', 'dex.config.mjs', 'dex.config.cjs']

let cachedConfig: { config: DexConfig; root: string } | null = null

export async function loadDexConfig(startDir = process.cwd()): Promise<{ config: DexConfig; root: string }> {
	if (cachedConfig) return cachedConfig

	let dir = path.resolve(startDir)
	const seen = new Set<string>()

	while (!seen.has(dir)) {
		seen.add(dir)

		for (const filename of CONFIG_FILENAMES) {
			const candidate = path.join(dir, filename)
			if (existsSync(candidate)) {
				try {
					const mod = await import(candidate)
					const config: DexConfig = mod.default ?? mod ?? {}
					const result = { config, root: dir }
					cachedConfig = result
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

	// No config found: use cwd as root, empty config
	const result = { config: {}, root: path.resolve(startDir) }
	cachedConfig = result
	return result
}

export const DEFAULT_PATHS = {
	pagesDir: 'web/pages',
	layoutsDir: 'web/layouts',
	outRoutesTs: 'core/router/.generated/routes.ts',
	outRoutesJson: 'core/router/.generated/manifest.json',
	outLayoutsTs: 'core/router/.generated/layouts.ts',
} as const

export function resolveFromRoot(root: string, input: string): string {
	return path.resolve(root, input)
}
