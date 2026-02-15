import pie from '@dex/pie'
import type { Api } from './index'

/**
 * Resolve the base URL for browser API calls.
 */
function defaultBaseUrl() {
	if (typeof window === 'undefined') return 'http://localhost:7990'
	return window.location.origin
}

/**
 * Typed browser client for the API routes.
 */
export const api = pie<Api>(`${defaultBaseUrl()}/api`)

