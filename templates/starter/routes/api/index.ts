import { Elysia } from 'elysia'
import { composeRoutes } from '@dex/router'

import health from './health'

/**
 * Register API routes in a single compose step.
 */
export function apiRoutes() {
	return <const App extends Elysia>(app: App) => {
		return composeRoutes(app, [
			health,
			// Add more routes here
		])
	}
}
