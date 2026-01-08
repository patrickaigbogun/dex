import { Elysia } from 'elysia'

import health from './health'

export function apiRoutes() {
	return <const App extends Elysia>(app: App) => {
		// Add your own modules here (they can live in nested folders).
		return health(app)
	}
}
