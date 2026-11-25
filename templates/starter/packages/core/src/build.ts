import path from 'node:path'
import { loadProjectConfig } from './config'
import { runPluginHook } from './plugins'

/**
 * Run Dex production build with `onBeforeBuild` and `onAfterBuild` plugin hooks.
 */
export async function runBuild(rootDir = process.cwd()): Promise<void> {
	const resolvedRoot = path.resolve(rootDir)
	const config = await loadProjectConfig(resolvedRoot)

	await runPluginHook(config.plugins, 'onBeforeBuild', { rootDir: resolvedRoot })
	const { dexBuild } = await import('@dex/dev')
	await dexBuild({ rootDir: resolvedRoot })

	const buildDir = path.resolve(resolvedRoot, config.build?.outDir ?? 'build')
	await runPluginHook(config.plugins, 'onAfterBuild', { rootDir: resolvedRoot, buildDir })
}
