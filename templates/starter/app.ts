import { Elysia } from 'elysia'

import { dexAssetsRoute, dexDevReloadRouter, dexPrettyLogger, dexSpaFallback } from '@dex/server'
import { apiRoutes } from './routes/api'

const port = Number(process.env.PORT ?? 7990)
if (!Number.isFinite(port) || port <= 0) throw new Error(`Invalid PORT: ${process.env.PORT}`)


export const app = new Elysia()
	.use(dexPrettyLogger({ ignore: (p) => p === '/__dev/reload' }))
	.group('/api', (api) => api.use(apiRoutes()))
	.use(dexAssetsRoute({ assetsDir: 'web/public/assets' }))
	.use(dexDevReloadRouter())
	.use(dexSpaFallback({ indexHtmlPath: 'web/public/index.html' }))
	.listen(port)

console.log(`Dex starter running at ${app.server?.hostname}:${app.server?.port}`)

