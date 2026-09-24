import { createPie } from './client'

export type * from './types'
export { createPie } from './client'
export { generateApi, type GenerateApiOptions } from './generator'
export { treatyPie, type PieTreatyOptions } from './treaty'

// Default export is createPie for fluent usage: `import pie from '@dex/pie'`
export default createPie
