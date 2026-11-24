import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dexBuildVercel } from './vercel'

export type DeployProvider = 'vercel' | 'netlify' | 'cloudflare' | 'railway' | 'render' | 'docker'

const ENV_EXAMPLE_CONTENT = `# Dex environment configuration
NODE_ENV=production
PORT=7990
PUBLIC_API_URL=http://localhost:7990
`

const NETLIFY_TOML_CONTENT = `[build]
  command = "bun run build"
  publish = "build"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`

const RAILWAY_TOML_CONTENT = `[build]
  builder = "DOCKERFILE"
  dockerfilePath = "Dockerfile"

[deploy]
  healthcheckPath = "/api/v1/health"
  healthcheckTimeout = 60
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
`

const DOCKERFILE_CONTENT = `# syntax=docker/dockerfile:1

FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY . .
RUN bun install --no-progress && bun run build

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \\
    && apt-get install -y --no-install-recommends ca-certificates curl \\
    && rm -rf /var/lib/apt/lists/* \\
    && groupadd --system --gid 1001 dex \\
    && useradd --system --uid 1001 --gid dex --no-create-home dex

COPY --from=builder --chown=dex:dex /app/build /app/build

ENV NODE_ENV=production
ENV PORT=7990

USER dex
EXPOSE 7990

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD curl -fsS http://127.0.0.1:7990/api/v1/health || exit 1

CMD ["/app/build/server"]
`

const DOCKER_COMPOSE_CONTENT = `services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "\${PORT:-7990}:7990"
    environment:
      NODE_ENV: production
      PORT: "7990"
    env_file:
      - path: .env
        required: false
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1:7990/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  dev:
    image: oven/bun:1-slim
    profiles: ["dev"]
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "\${PORT:-7990}:7990"
    environment:
      NODE_ENV: development
      PORT: "7990"
    env_file:
      - path: .env
        required: false
    command: sh -c "bun install --no-progress && bun run dev"
`

const DOCKERIGNORE_CONTENT = `node_modules
build
.vercel
.git
.gitignore
.env
.env.*
!.env.example
*.log
*.sqlite*
*.db
*.pem
*.key
.dex/
.DS_Store
coverage
.cache
`

const CLOUDFLARE_ASSETSIGNORE_CONTENT = `server
server.exe
__ssg
`

async function resolveAppName(rootDir: string): Promise<string> {
	const fallback = path.basename(rootDir) || 'dex-app'
	const pkgPath = path.join(rootDir, 'package.json')
	let rawName = fallback
	if (existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
			if (typeof pkg?.name === 'string' && pkg.name.trim()) {
				rawName = pkg.name.trim()
			}
		} catch {
			// ignore
		}
	}
	const sanitized = rawName
		.replace(/^@[^/]+\//, '')
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return sanitized || 'dex-app'
}

async function writeIfMissing(rootDir: string, relPath: string, content: string, filesWritten: string[]): Promise<void> {
	const fullPath = path.join(rootDir, relPath)
	if (existsSync(fullPath)) return
	await mkdir(path.dirname(fullPath), { recursive: true })
	await writeFile(fullPath, content, 'utf8')
	filesWritten.push(relPath)
}

/**
 * Prepare deployment artifacts and configuration files for a target provider.
 */
export async function dexPrepareProvider(opts: {
	rootDir: string
	provider: DeployProvider
}): Promise<{ filesWritten: string[] }> {
	const rootDir = path.resolve(opts.rootDir)
	const filesWritten: string[] = []

	switch (opts.provider) {
		case 'vercel': {
			const { outputDir } = await dexBuildVercel({ rootDir })
			const relOut = path.relative(rootDir, outputDir) || '.vercel/output'
			filesWritten.push(
				path.join(relOut, 'config.json'),
				path.join(relOut, 'static'),
				path.join(relOut, 'functions', 'api.func', 'index.mjs'),
				path.join(relOut, 'functions', 'api.func', '.vc-config.json'),
				path.join(relOut, 'functions', 'api.func', 'package.json')
			)
			break
		}
		case 'netlify': {
			await writeIfMissing(rootDir, 'netlify.toml', NETLIFY_TOML_CONTENT, filesWritten)
			break
		}
		case 'cloudflare': {
			const appName = await resolveAppName(rootDir)
			const wranglerToml = `name = "${appName}"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[assets]
  directory = "build"
  not_found_handling = "single-page-application"
`
			await writeIfMissing(rootDir, 'wrangler.toml', wranglerToml, filesWritten)
			await writeIfMissing(rootDir, 'build/.assetsignore', CLOUDFLARE_ASSETSIGNORE_CONTENT, filesWritten)
			break
		}
		case 'railway': {
			await writeIfMissing(rootDir, 'railway.toml', RAILWAY_TOML_CONTENT, filesWritten)
			break
		}
		case 'render': {
			const appName = await resolveAppName(rootDir)
			const renderYaml = `services:
  - type: web
    name: ${appName}
    runtime: docker
    plan: free
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "7990"
`
			await writeIfMissing(rootDir, 'render.yaml', renderYaml, filesWritten)
			break
		}
		case 'docker': {
			await writeIfMissing(rootDir, 'Dockerfile', DOCKERFILE_CONTENT, filesWritten)
			await writeIfMissing(rootDir, 'docker-compose.yml', DOCKER_COMPOSE_CONTENT, filesWritten)
			await writeIfMissing(rootDir, '.dockerignore', DOCKERIGNORE_CONTENT, filesWritten)
			break
		}
		default: {
			throw new Error(`Unsupported deploy provider: ${String(opts.provider)}`)
		}
	}

	await writeIfMissing(rootDir, '.env.example', ENV_EXAMPLE_CONTENT, filesWritten)
	return { filesWritten }
}
