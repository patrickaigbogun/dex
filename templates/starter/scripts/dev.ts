import { spawnGroup } from '@dex/dev'

/**
 * Generate routes once before starting watchers.
 */
async function runGenerate() {
	const proc = Bun.spawn(
		[
			'bunx',
			'--bun',
			'dex-router',
			'generate',
			'--pagesDir',
			'web/pages',
			'--layoutsDir',
			'web/layouts',
			'--outRoutesTs',
			'core/router/.generated/routes.ts',
			'--outRoutesJson',
			'core/router/.generated/manifest.json',
			'--outLayoutsTs',
			'core/router/.generated/layouts.ts',
		],
		{ stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' }
	)
	const code = await proc.exited
	if (code !== 0) process.exit(code)
}

await runGenerate()

// Run parallel watchers for routes, CSS, client build, and server reloads.
spawnGroup([
	{
		name: 'routes:watch',
		cmd: [
			'bunx',
			'--bun',
			'dex-router',
			'watch',
			'--pagesDir',
			'web/pages',
			'--layoutsDir',
			'web/layouts',
			'--outRoutesTs',
			'core/router/.generated/routes.ts',
			'--outRoutesJson',
			'core/router/.generated/manifest.json',
			'--outLayoutsTs',
			'core/router/.generated/layouts.ts',
		],
	},
	{
		name: 'css:watch',
		cmd: [
			'bun',
			'tailwindcss',
			'--watch',
			'-i',
			'web/styles/index.css',
			'-o',
			'web/public/assets/styles.css',
		],
	},
	{
		name: 'client:watch',
		cmd: [
			'bun',
			'build',
			'core/bootstrap/web.tsx',
			'--target',
			'browser',
			'--outfile',
			'web/public/assets/client.js',
			'--watch',
		],
	},
	{
		name: 'server:watch',
		cmd: [
			'bun',
			'--watch',
			'core/runtime/app',
			'--watch',
			'./web/pages',
			'--watch',
			'./web/layouts',
			'--no-clear-screen',
		],
	},
])

await new Promise<never>(() => {})
