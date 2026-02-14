import { Elysia } from 'elysia'
import { createServer } from 'node:net'

import { dexAssetsRoute, dexDevReloadRouter, dexPrettyLogger, dexSpaFallback } from '@dex/server'
import { apiRoutes } from './routes/api'

const port = Number(process.env.PORT ?? 7990)
if (!Number.isFinite(port) || port <= 0) throw new Error(`Invalid PORT: ${process.env.PORT}`)

function checkPortAvailable(p: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = createServer()
		server.once('error', () => resolve(false))
		server.once('listening', () => {
			server.close()
			resolve(true)
		})
		server.listen(p, '127.0.0.1')
	})
}

const available = await checkPortAvailable(port)
if (!available) {
	console.error(`ERROR: Port ${port} is already in use.`)
	console.error(`Try: PORT=${port + 1} bun app.ts`)
	process.exit(1)
}

export const app = new Elysia()
	.use(dexPrettyLogger({ ignore: (p) => p === '/__dev/reload' }))
	.group('/api', (api) => api.use(apiRoutes()))
	.use(dexAssetsRoute({ assetsDir: 'web/public/assets' }))
	.use(dexDevReloadRouter())
	.use(dexSpaFallback({ indexHtmlPath: 'web/public/index.html' }))
	.listen({ port, reusePort: false })

console.log(`Dex starter running at ${app.server?.hostname}:${app.server?.port}`)

