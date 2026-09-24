import { describe, expect, it } from 'bun:test'
import { getPublicEnvDefines } from '../src/env'

describe('getPublicEnvDefines', () => {
	it('filters and converts public environment variables into bun define flags', () => {
		const originalEnv = { ...process.env }
		process.env.PUBLIC_API_URL = 'https://api.example.com'
		process.env.NEXT_PUBLIC_CLIENT_ID = 'client_12345'
		process.env.VITE_APP_NAME = 'Concord'
		process.env.SECRET_KEY = 'super_secret'

		try {
			const defines = getPublicEnvDefines()

			expect(defines).toContain('--define')
			expect(defines).toContain('process.env.PUBLIC_API_URL="https://api.example.com"')
			expect(defines).toContain('process.env.NEXT_PUBLIC_CLIENT_ID="client_12345"')
			expect(defines).toContain('process.env.VITE_APP_NAME="Concord"')

			// Secret key should NOT be included
			const secretPresent = defines.some((d) => d.includes('SECRET_KEY'))
			expect(secretPresent).toBe(false)
		} finally {
			process.env = originalEnv
		}
	})
})
