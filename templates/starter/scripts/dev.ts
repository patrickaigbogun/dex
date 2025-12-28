import { spawnGroup } from '@dex/dev'

spawnGroup([
	{
		name: 'routes:watch',
		cmd: [
			'bunx',
			'dex-router',
			'watch',
			'--pagesDir',
			'web/pages',
			'--layoutsDir',
			'web/layouts',
			'--outRoutesTs',
			'dex/.generated/routes.ts',
			'--outRoutesJson',
			'dex/.generated/manifest.json',
			'--outLayoutsTs',
			'dex/.generated/layouts.ts',
		],
	},
	{
		name: 'css:watch',
		cmd: [
			'bunx',
			'@tailwindcss/cli',
			'-i',
			'web/styles/index.css',
			'-o',
			'web/public/assets/styles.css',
			'--watch',
		],
	},
	{
		name: 'client:watch',
		cmd: [
			'bun',
			'build',
			'client/entry.tsx',
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
			'app.ts',
			'--watch',
			'./web/pages',
			'--watch',
			'./web/layouts',
			'--no-clear-screen',
		],
	},
])

await new Promise<never>(() => {})
