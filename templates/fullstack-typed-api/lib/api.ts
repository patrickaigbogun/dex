import { createPie } from '@dex/pie'
import type { Api } from '../../routes/api'

export const api = createPie<Api>({
  baseUrl: typeof window !== 'undefined' ? window.location.origin : (process.env.PUBLIC_API_URL ?? 'http://localhost:7990'),
  prefix: '/api',
})
