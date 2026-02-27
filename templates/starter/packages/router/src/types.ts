/**
 * Parsed segment from a file-based route.
 */
export type RouteSegment =
	| { kind: 'static'; value: string }
	| { kind: 'param'; name: string }
	| { kind: 'catchAll'; name: string }

/**
 * Params extracted from a matched route.
 */
export type Params = Record<string, string | string[]>

/**
 * Optional page metadata applied by the router at runtime.
 */
export type Metadata = {
	title?: string
	description?: string
}

/**
 * Rendering strategy for a route/layout/module.
 *
 * - `spa`: client-only (no prerender)
 * - `ssg`: pre-render at build time
 * - `ssr`: render on each request (future)
 * - `ppr`: partial pre-render (future)
 * - `dynamic`: opt-in client rendering (e.g. islands)
 */
export type RenderStrategy = 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'

/**
 * Layout identifier mapped from file names.
 */
export type LayoutName = string

/**
 * Static or dynamic layout selection for a page module.
 *
 * @example
 * ```ts
 * export const layout: LayoutSelector = 'global'
 * // or
 * export const layout: LayoutSelector = () => (isAdmin ? 'admin' : 'global')
 * ```
 */
export type LayoutSelector = LayoutName | (() => LayoutName)

/**
 * Dynamic layout module shape used by the client runtime.
 *
 * @example
 * ```ts
 * export default function GlobalLayout({ children }: { children: any }) {
 *   return <div className="layout">{children}</div>
 * }
 * ```
 */
export type LayoutModule = {
	default: (props: { children: any }) => any
	render?: RenderStrategy
}

/**
 * Runtime context exposed to hooks like `useParams` and `useLocation`.
 */
export type RouteContext = {
	pathname: string
	search: string
	params: Params
	query: URLSearchParams
}

/**
 * Page module contract used by the file router.
 */
export type PageModule = {
	default: (props: any) => any
	metadata?: Metadata
	layout?: LayoutSelector
	render?: RenderStrategy
}

/**
 * Generated route record used by the client router.
 */
export type Route = {
	file: string
	path: string
	segments: RouteSegment[]
	importPage: () => Promise<PageModule>
}
