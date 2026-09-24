import { Elysia } from 'elysia'

import { dexAssetsRoute, dexDevReloadRouter, dexPrettyLogger, dexSpaFallback, findAvailablePort } from '@dex/server'
import { apiRoutes } from '../../../routes/api'

const basePort = Number(process.env.PORT ?? 7990)
if (!Number.isFinite(basePort) || basePort <= 0) throw new Error(`Invalid PORT: ${process.env.PORT}`)

const port = findAvailablePort(basePort)
if (port !== basePort) {
	console.log(`Port ${basePort} is in use. Using ${port} instead.`)
}

/**
 * Dev server entry for the starter template.
 */
export const app = new Elysia()
	.use(dexPrettyLogger({ ignore: (p) => p === '/__dev/reload' }))
	.group('/api', (api) => api.use(apiRoutes()))
	.use(dexAssetsRoute({ assetsDir: 'web/public/assets' }))
	.use(dexDevReloadRouter())
	.use(dexSpaFallback({ indexHtmlPath: 'web/public/index.html' }))
	.listen({ port, reusePort: false })

console.log(`Dex starter running at ${app.server?.hostname}:${app.server?.port}`)
