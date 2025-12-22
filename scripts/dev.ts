export {}
const processes: Array<{ name: string; proc: ReturnType<typeof Bun.spawn> }> = []

function spawn(name: string, cmd: string[]) {
	const proc = Bun.spawn(cmd, {
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit',
		env: { ...process.env },
	})

	processes.push({ name, proc })

	proc.exited.then((code) => {
		// If one process exits unexpectedly, stop everything.
		if (code !== 0) {
			// eslint-disable-next-line no-console
			console.error(`[dev] ${name} exited with code ${code}`)
			shutdown(code)
		}
	})

	return proc
}

function shutdown(code = 0) {
	for (const { proc } of processes) {
		try {
			proc.kill('SIGTERM')
		} catch {
			// ignore
		}
	}
	process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

spawn('routes:watch', ['bun', 'core/router/generate.ts', '--watch'])
spawn('css:watch', [
	'bunx',
	'@tailwindcss/cli',
	'-i',
	'web/styles/index.css',
	'-o',
	'web/public/assets/styles.css',
	'--watch',
])
spawn('client:watch', [
	'bun',
	'build',
	'core/router/client/entry.tsx',
	'--target',
	'browser',
	'--outfile',
	'web/public/assets/client.js',
	'--watch',
])
spawn('server:watch', [
	'bun',
	'--watch',
	'app.ts',
	'--watch',
	'./routes',
	'--watch',
	'./core',
	'--watch',
	'./web/pages',
	'--no-clear-screen',
])

// Keep the dev script alive
await new Promise<never>(() => {})
