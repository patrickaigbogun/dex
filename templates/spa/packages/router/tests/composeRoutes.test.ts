import { describe, expect, it } from 'bun:test'
import { composeRoutes } from '../src/composeRoutes'

describe('composeRoutes', () => {
	it('chains route registering functions in order onto an app target', () => {
		type MockApp = {
			routes: string[]
			addRoute: (path: string) => MockApp
		}

		const createApp = (): MockApp => ({
			routes: [],
			addRoute(path: string) {
				return { ...this, routes: [...this.routes, path] }
			},
		})

		const routeA = (app: MockApp) => app.addRoute('/api/health')
		const routeB = (app: MockApp) => app.addRoute('/api/users')
		const routeC = (app: MockApp) => app.addRoute('/api/posts')

		const app = createApp()
		const composed = composeRoutes(app, [routeA, routeB, routeC])

		expect(composed.routes).toEqual(['/api/health', '/api/users', '/api/posts'])
	})

	it('returns original app when route list is empty', () => {
		const app = { initial: true }
		const composed = composeRoutes(app, [])
		expect(composed).toBe(app)
	})
})
