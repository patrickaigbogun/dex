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
