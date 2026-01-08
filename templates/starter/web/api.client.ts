import pie from '@dex/pie'
import type { Api } from '../api.app'

function defaultBaseUrl() {
	if (typeof window === 'undefined') return 'http://localhost:7990'
	return window.location.origin
}

export const api = pie<Api>(`${defaultBaseUrl()}/api`)

