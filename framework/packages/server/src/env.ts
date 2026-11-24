import fs from 'node:fs'
import path from 'node:path'

const PUBLIC_ENV_KEY_RE = /^(NEXT_PUBLIC_|PUBLIC_|VITE_)[A-Za-z0-9_]+$/

/**
 * Reads environment variables from .env and process.env, filtering for those
 * safe for client-side injection (prefixed with NEXT_PUBLIC_, PUBLIC_, or VITE_).
 * Returns an array of --define arguments for Bun build/spawn.
 */
export function getPublicEnvDefines(cwd = process.cwd()): string[] {
	const envPath = path.resolve(cwd, '.env')
	const env: Record<string, string | undefined> = Object.create(null)

	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, 'utf-8')
		envContent.split('\n').forEach((line) => {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) return
			const withoutExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
			const eqIdx = withoutExport.indexOf('=')
			if (eqIdx === -1) return
			const key = withoutExport.slice(0, eqIdx).trim()
			let rawVal = withoutExport.slice(eqIdx + 1).trim()
			if (
				(rawVal.startsWith('"') && rawVal.endsWith('"') && rawVal.length >= 2) ||
				(rawVal.startsWith("'") && rawVal.endsWith("'") && rawVal.length >= 2)
			) {
				rawVal = rawVal.slice(1, -1)
			}
			if (key) {
				env[key] = rawVal
			}
		})
	}

	// Also include process.env vars that might be set in the shell
	Object.assign(env, process.env)

	const defineArgs: string[] = []
	Object.entries(env).forEach(([key, value]) => {
		if (value !== undefined && PUBLIC_ENV_KEY_RE.test(key)) {
			defineArgs.push('--define')
			defineArgs.push(`process.env.${key}=${JSON.stringify(value)}`)
		}
	})

	return defineArgs
}
