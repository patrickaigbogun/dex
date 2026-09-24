import fs from 'node:fs'
import path from 'node:path'

/**
 * Reads environment variables from .env and process.env, filtering for those
 * safe for client-side injection (prefixed with NEXT_PUBLIC_, PUBLIC_, or VITE_).
 * Returns an array of --define arguments for Bun build/spawn.
 */
export function getPublicEnvDefines(cwd = process.cwd()): string[] {
	const envPath = path.resolve(cwd, '.env')
	const env: Record<string, string> = {}
	
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, 'utf-8')
		envContent.split('\n').forEach((line) => {
			const trimmed = line.trim()
			if (trimmed && !trimmed.startsWith('#')) {
				const [key, ...valueParts] = trimmed.split('=')
				if (key) {
					env[key] = valueParts.join('=')
				}
			}
		})
	}

	// Also include process.env vars that might be set in the shell
	Object.assign(env, process.env)

	const defineArgs: string[] = []
	Object.entries(env).forEach(([key, value]) => {
		if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('PUBLIC_') || key.startsWith('VITE_')) {
			defineArgs.push('--define')
			defineArgs.push(`process.env.${key}=${JSON.stringify(value)}`)
		}
	})
	
	return defineArgs
}
