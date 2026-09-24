export async function isPortAvailable(port: number): Promise<boolean> {
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

export async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
    let port = startPort
    for (let i = 0; i < maxAttempts; i++) {
        if (await isPortAvailable(port)) return port
        port++
        if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 10))
    }
    throw new Error(`Could not find an available port starting from ${startPort}`)
}
