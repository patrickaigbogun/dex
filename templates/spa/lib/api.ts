import { createPie } from '@dex/pie'
// import type { ApiRoutes } from '@dex/generated/api'

/**
 * Userland API client instance.
 * Configure global headers, auth token resolvers, and baseURL overrides here.
 */
export const api = createPie<any>({
	prefix: '/api',
	headers: () => ({
		// Authorization: `Bearer ${getAuthToken()}`,
	}),
})
