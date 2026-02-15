/**
 * Spawned process metadata for a managed task.
 */
export type Spawned = { name: string; proc: ReturnType<typeof Bun.spawn> }

/**
 * Spawn a set of tasks and terminate the group if any exits non-zero.
 */
export function spawnGroup(tasks: Array<{ name: string; cmd: string[] }>) {
	const processes: Spawned[] = []
	const raw = process.env.DEX_DEV_RAW === '1' || process.env.DEX_DEV_RAW === 'true'
	const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR

	const tagColors = ['\x1b[36m', '\x1b[35m', '\x1b[34m', '\x1b[32m', '\x1b[33m']
	const reset = '\x1b[0m'
	const dim = '\x1b[2m'

	function formatTag(name: string, colorIndex: number) {
		if (!useColor) return `[${name}]`
		const c = tagColors[colorIndex % tagColors.length]!
		return `${dim}[${c}${name}${reset}${dim}]${reset}`
	}

	async function pumpLines(
		readable: ReadableStream<Uint8Array>,
		onLine: (line: string) => void,
	) {
		const decoder = new TextDecoder()
		const reader = readable.getReader()
		let buf = ''
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			buf += decoder.decode(value, { stream: true })

			let nl = buf.indexOf('\n')
			while (nl !== -1) {
				const line = buf.slice(0, nl).replace(/\r$/, '')
				buf = buf.slice(nl + 1)
				onLine(line)
				nl = buf.indexOf('\n')
			}
		}
		buf += decoder.decode()
		if (buf.length) onLine(buf.replace(/\r$/, ''))
	}

	function spawn(name: string, cmd: string[]) {
		const proc = Bun.spawn(cmd, {
			stdout: raw ? 'inherit' : 'pipe',
			stderr: raw ? 'inherit' : 'pipe',
			stdin: 'inherit',
			env: { ...process.env },
		})

		processes.push({ name, proc })

		if (!raw) {
			const colorIndex = processes.length
			const tag = formatTag(name, colorIndex)
			if (proc.stdout) {
				pumpLines(proc.stdout, (line) => {
					process.stdout.write(`${tag} ${line}\n`)
				})
			}
			if (proc.stderr) {
				pumpLines(proc.stderr, (line) => {
					process.stderr.write(`${tag} ${line}\n`)
				})
			}
		}

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
