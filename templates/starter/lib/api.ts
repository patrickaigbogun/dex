import { createPie } from '@dex/pie'
import type { ApiRoutes } from '@core/api/generated'

/**
 * Userland API client instance.
 * Configure global headers, auth token resolvers, and baseURL overrides here.
 */
export const api = createPie<ApiRoutes>({
	prefix: '/api',
	headers: () => ({
		// Authorization: `Bearer ${getAuthToken()}`,
	}),
})
