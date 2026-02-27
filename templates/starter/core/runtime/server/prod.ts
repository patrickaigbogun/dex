import { existsSync } from 'node:fs'
import path from 'node:path'

import { Elysia } from 'elysia'

import { dexAssetsRoute, dexPrettyLogger, dexSpaFallback } from '@dex/server'
import { apiRoutes } from '../../../routes/api'
import { findAvailablePort } from '../../../utils/port'

const basePort = Number(process.env.PORT ?? 7990)
if (!Number.isFinite(basePort) || basePort <= 0) throw new Error(`Invalid PORT: ${process.env.PORT}`)

/**
 * When enabled, serve only API routes (no SPA assets).
 */
const apiOnly = process.env.DEX_API_ONLY === '1' || process.env.DEX_API_ONLY === 'true'

// When compiled with `bun build --compile`, this should resolve to the executable path.
const exePath = process.execPath || process.argv[0] || ''
const buildDir = exePath ? path.dirname(exePath) : process.cwd()

const assetsDir = path.join(buildDir, 'assets')
const indexHtmlPath = path.join(buildDir, 'index.html')
const ssgDir = path.join(buildDir, '__ssg')

/**
 * Production server entry for the starter template.
 */
const app = new Elysia()
	.use(dexPrettyLogger())
	.group('/api', (api) => api.use(apiRoutes()))

if (!apiOnly && existsSync(assetsDir)) {
	app.use(dexAssetsRoute({ assetsDir }))
}

if (!apiOnly && existsSync(indexHtmlPath)) {
	app.use(dexSpaFallback({ indexHtmlPath, ssgDir }))
}

const port = findAvailablePort(basePort)
if (port !== basePort) {
	console.log(`Port ${basePort} is in use. Using ${port} instead.`)
}

app.listen({ port, reusePort: false })

console.log(`Dex starter running at ${app.server?.hostname}:${app.server?.port}`)
