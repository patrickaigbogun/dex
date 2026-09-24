export type * from './types'
export {
	generateFsRoutes,
	generateLayouts,
	watchAndGenerate,
	parseSegment,
	fileToRoute,
	fileToLayoutName,
	getSegmentScore,
	compareRouteSegments,
	sortRoutesByPrecedence,
} from './generate'
export { composeRoutes } from './composeRoutes'
export type { DexConfig } from './config'
export { loadDexConfig, DEFAULT_PATHS } from './config'

