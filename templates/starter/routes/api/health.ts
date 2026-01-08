import type { Elysia } from 'elysia'

export default function health<const App extends Elysia>(api: App) {
	return api.get('/health', () => ({ ok: true }))
}
