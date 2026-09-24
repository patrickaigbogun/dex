import { describe, expect, it } from 'bun:test'
import { findAvailablePort, isPortAvailable } from '../src/port'

describe('Port utility functions', () => {
	it('checks if a high random ephemeral port is available', async () => {
		const highPort = 39120 + Math.floor(Math.random() * 500)
		const available = await isPortAvailable(highPort)
		expect(typeof available).toBe('boolean')
	})

	it('finds an available port starting from a given base port', async () => {
		const basePort = 41200 + Math.floor(Math.random() * 500)
		const port = await findAvailablePort(basePort)
		expect(port).toBeGreaterThanOrEqual(basePort)
		expect(port).toBeLessThan(basePort + 100)
	})
})
