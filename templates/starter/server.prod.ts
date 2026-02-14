import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'

import { Elysia } from 'elysia'

import { dexAssetsRoute, dexPrettyLogger, dexSpaFallback } from '@dex/server'
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

const apiOnly = process.env.DEX_API_ONLY === '1' || process.env.DEX_API_ONLY === 'true'

// When compiled with `bun build --compile`, this should resolve to the executable path.
const exePath = process.execPath || process.argv[0] || ''
const buildDir = exePath ? path.dirname(exePath) : process.cwd()

const assetsDir = path.join(buildDir, 'assets')
const indexHtmlPath = path.join(buildDir, 'index.html')

const app = new Elysia()
	.use(dexPrettyLogger())
	.group('/api', (api) => api.use(apiRoutes()))

if (!apiOnly && existsSync(assetsDir)) {
	app.use(dexAssetsRoute({ assetsDir }))
}

if (!apiOnly && existsSync(indexHtmlPath)) {
	app.use(dexSpaFallback({ indexHtmlPath }))
}

const available = await checkPortAvailable(port)
if (!available) {
	console.error(`ERROR: Port ${port} is already in use.`)
	console.error(`Try: PORT=${port + 1} bun server.prod.ts`)
	process.exit(1)
}

app.listen({ port, reusePort: false })

console.log(`Dex starter running at ${app.server?.hostname}:${app.server?.port}`)
