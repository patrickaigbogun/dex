import { Elysia } from 'elysia'

import { dexAssetsRoute, dexDevReloadRouter, dexSpaFallback } from '@dex/server'

const app = new Elysia()
	.use(dexAssetsRoute({ assetsDir: 'web/public/assets' }))
	.use(dexDevReloadRouter())
	.use(dexSpaFallback({ indexHtmlPath: 'web/public/index.html' }))
	.listen(7990)

console.log(`Dex starter running at ${app.server?.hostname}:${app.server?.port}`)
