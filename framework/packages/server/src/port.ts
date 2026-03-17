export function isPortAvailable(port: number): boolean {
	try {
		const probe = Bun.serve({
			port,
			reusePort: false,
			fetch: () => new Response('ok'),
		})
		probe.stop(true)
		return true
	} catch {
		return false
	}
}

export function findAvailablePort(startPort: number, maxAttempts = 100): number {
	let port = startPort
	for (let i = 0; i < maxAttempts; i++) {
		if (isPortAvailable(port)) return port
		port += 1
	}
	throw new Error(`Could not find an available port starting from ${startPort}`)
}
