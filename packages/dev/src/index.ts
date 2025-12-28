export type Spawned = { name: string; proc: ReturnType<typeof Bun.spawn> }

export function spawnGroup(tasks: Array<{ name: string; cmd: string[] }>) {
	const processes: Spawned[] = []

	function spawn(name: string, cmd: string[]) {
		const proc = Bun.spawn(cmd, {
			stdout: 'inherit',
			stderr: 'inherit',
			stdin: 'inherit',
			env: { ...process.env },
		})

		processes.push({ name, proc })

		proc.exited.then((code) => {
			if (code !== 0) {
				console.error(`[dex-dev] ${name} exited with code ${code}`)
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

	for (const t of tasks) spawn(t.name, t.cmd)

	return { shutdown, processes }
}
