import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
	startTransition as reactStartTransition,
} from 'react'

import type {
	LayoutModule,
	LayoutSelector,
	Metadata,
	NavigateOptions,
	PageModule,
	Params,
	PrefetchStrategy,
	Route,
	RouteContext,
	RouteSegment,
} from '../types'

// Module-level caches for instant route and layout resolution
const pageModuleCache = new Map<string, PageModule | Promise<PageModule>>()
const layoutModuleCache = new Map<string, LayoutModule | Promise<LayoutModule>>()

type RouterState = RouteContext & {
	navigate: (to: string, options?: NavigateOptions) => void
	prefetch: (to: string) => Promise<void>
}

const RouterContext = createContext<RouterState | null>(null)
const OutletContext = createContext<any>(null)

function hasUnsafeScheme(to: string) {
	const s = to.trim().toLowerCase()
	const m = /^([a-z0-9+.-]+):/.exec(s)
	if (!m) return false
	return m[1] === 'javascript' || m[1] === 'data' || m[1] === 'vbscript'
}

function isExternalTo(to: string) {
	try {
		const url = new URL(to, window.location.origin)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return true
		return url.origin !== window.location.origin
	} catch {
		return false
	}
}

function isDataSaverEnabled(): boolean {
	if (typeof navigator === 'undefined') return false
	const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
	return Boolean(conn?.saveData)
}

function normalizeRelForTargetBlank(rel: string | undefined, target: string | undefined) {
	if (target !== '_blank') return rel
	const tokens = new Set(
		(rel ?? '')
			.split(/\s+/g)
			.map((x) => x.trim())
			.filter(Boolean)
	)
	tokens.add('noopener')
	tokens.add('noreferrer')
	return Array.from(tokens).join(' ')
}

export function normalizePathname(p: string): string {
	if (!p) return '/'
	if (p !== '/' && p.endsWith('/')) return p.slice(0, -1)
	return p
}

export function splitPathname(pathname: string): string[] {
	const p = normalizePathname(pathname)
	if (p === '/') return []
	return p.split('/').filter(Boolean)
}

function safeDecode(val: string): string {
	try {
		return decodeURIComponent(val)
	} catch {
		return val
	}
}

export function matchRoute(segments: RouteSegment[], pathname: string): Params | null {
	const parts = splitPathname(pathname)
	const params: Params = {}

	let i = 0
	for (const seg of segments) {
		if (seg.kind === 'static') {
			if (parts[i] !== seg.value) return null
			i++
			continue
		}

		if (seg.kind === 'param') {
			if (i >= parts.length) return null
			params[seg.name] = safeDecode(parts[i]!)
			i++
			continue
		}

		// catchAll
		params[seg.name] = parts.slice(i).map(safeDecode)
		i = parts.length
		break
	}

	if (i !== parts.length) return null
	return params
}

export function findMatchingRoute(routes: Route[], pathname: string): { route: Route; params: Params } | null {
	for (const r of routes) {
		const params = matchRoute(r.segments, pathname)
		if (params) return { route: r, params }
	}
	return null
}

function applyMetadata(meta?: Metadata) {
	if (!meta || typeof document === 'undefined') return
	if (typeof meta.title === 'string') {
		document.title = meta.title
	}

	if (typeof meta.description === 'string') {
		let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
		if (!tag) {
			tag = document.createElement('meta')
			tag.name = 'description'
			document.head.appendChild(tag)
		}
		tag.content = meta.description
	}
}

function resolveLayoutName(sel: LayoutSelector | undefined): string | undefined {
	if (!sel) return
	if (typeof sel === 'string') return sel
	if (typeof sel === 'function') {
		try {
			const v = sel()
			if (typeof v === 'string') return v
		} catch {
			return
		}
	}
}

function getDefaultExport(mod: any) {
	return mod?.default ?? mod
}

async function loadPageModule(route: Route): Promise<any> {
	const cached = pageModuleCache.get(route.file)
	if (cached) return cached

	const promise = route.importPage().then((mod) => {
		pageModuleCache.set(route.file, mod)
		return mod
	})
	pageModuleCache.set(route.file, promise)
	return promise
}

async function loadLayoutModule(
	name: string,
	layoutsMap?: Record<string, () => Promise<LayoutModule>>
): Promise<any> {
	const cached = layoutModuleCache.get(name)
	if (cached) return cached

	if (!layoutsMap || !layoutsMap[name]) return undefined

	const loader = layoutsMap[name]!
	const promise = loader().then((mod) => {
		layoutModuleCache.set(name, mod)
		return mod
	})
	layoutModuleCache.set(name, promise)
	return promise
}

/**
 * Access route params from the current match.
 */
export function useParams<T extends Params = Params>(): T {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('useParams must be used within <FileRouter />')
	return ctx.params as T
}

/**
 * Access the current URL query params as a standard URLSearchParams object.
 */
export function useQuery(): URLSearchParams {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('useQuery must be used within <FileRouter />')
	return ctx.query
}

/**
 * Access the current location (pathname, search, hash).
 */
export function useLocation(): { pathname: string; search: string; hash: string } {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('useLocation must be used within <FileRouter />')
	return { pathname: ctx.pathname, search: ctx.search, hash: ctx.hash }
}

/**
 * Returns true if a route transition is actively loading in the background.
 */
export function useIsNavigating(): boolean {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('useIsNavigating must be used within <FileRouter />')
	return ctx.isNavigating
}

/**
 * Returns the entire current router state.
 */
export function useRouterState(): RouterState {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('useRouterState must be used within <FileRouter />')
	return ctx
}

/**
 * Programmatic navigation within the file router.
 */
export function useNavigate(): (to: string, options?: NavigateOptions) => void {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('useNavigate must be used within <FileRouter />')
	return ctx.navigate
}

/**
 * Prefetch a route ahead of time into memory.
 */
export function usePrefetch(): (to: string) => Promise<void> {
	const ctx = useContext(RouterContext)
	if (!ctx) throw new Error('usePrefetch must be used within <FileRouter />')
	return ctx.prefetch
}

/**
 * Outlet component for nested layout rendering.
 */
export function Outlet<T = any>(props: { context?: T }) {
	const currentChild = useContext(OutletContext)
	if (props.context !== undefined) {
		return <OutletContext.Provider value={props.context}>{currentChild}</OutletContext.Provider>
	}
	return currentChild ?? null
}

/**
 * Access context passed to an `<Outlet context={...} />`.
 */
export function useOutletContext<T = any>(): T {
	return useContext(OutletContext) as T
}

export type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
	to: string
	replace?: boolean
	prefetch?: PrefetchStrategy
}

/**
 * Client-side link that routes via the FileRouter context with automatic prefetching.
 */
export function Link(props: LinkProps) {
	const ctx = useContext(RouterContext)
	const { to, replace, prefetch = 'intent', onClick, onMouseEnter, onMouseLeave, onFocus, target, rel, ...rest } = props

	const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const unsafe = hasUnsafeScheme(to)
	const href = unsafe ? '#' : to
	const finalRel = normalizeRelForTargetBlank(rel, target)

	const shouldPrefetch = prefetch !== 'none' && prefetch !== false && !isDataSaverEnabled()

	const doPrefetch = () => {
		if (shouldPrefetch && ctx && !unsafe && !isExternalTo(to)) {
			ctx.prefetch(to).catch(() => {})
		}
	}

	useEffect(() => {
		if (prefetch === 'render' && shouldPrefetch) {
			doPrefetch()
		}
		return () => {
			if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
		}
	}, [to, prefetch, shouldPrefetch])

	const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
		onMouseEnter?.(e)
		if (shouldPrefetch && prefetch !== 'render') {
			// Debounce hover prefetch by 65ms to ignore rapid mouse sweeping
			if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = setTimeout(() => {
				doPrefetch()
			}, 65)
		}
	}

	const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
		onMouseLeave?.(e)
		if (hoverTimerRef.current) {
			clearTimeout(hoverTimerRef.current)
			hoverTimerRef.current = null
		}
	}

	const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
		onFocus?.(e)
		if (shouldPrefetch) {
			doPrefetch()
		}
	}

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		onClick?.(e)
		if (e.defaultPrevented) return
		if (unsafe) {
			e.preventDefault()
			return
		}
		// If no router is mounted (e.g. SSG/SSR render), behave like a normal <a>.
		if (!ctx) return
		if (isExternalTo(to)) return
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
		if (target && target !== '_self') return

		e.preventDefault()
		ctx.navigate(to, { replace })
	}

	return (
		<a
			{...rest}
			target={target}
			rel={finalRel}
			href={href}
			onClick={handleClick}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onFocus={handleFocus}
		/>
	)
}

/**
 * Client-only render boundary.
 *
 * Useful for SSG pages that contain dynamic/browser-only components.
 * Renders fallback on the server/initial paint, then switches to children after mount.
 */
export function ClientOnly(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
	const { children, fallback = null } = props
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	return mounted ? <>{children}</> : <>{fallback}</>
}

/**
 * Wrap a component so it only renders on the client.
 */
export function clientOnly<P extends {}>(Component: React.ComponentType<P>, fallback?: React.ReactNode) {
	return function ClientOnlyWrapped(props: P) {
		return (
			<ClientOnly fallback={fallback}>
				<Component {...props} />
			</ClientOnly>
		)
	}
}

type LoadedRouteView = {
	file: string
	path: string
	Page: React.ComponentType<any>
	Layout?: React.ComponentType<{ children: React.ReactNode }>
}

/**
 * Props for the file-based router runtime.
 */
export type FileRouterProps = {
	routes: Route[]
	layouts?: Record<string, () => Promise<LayoutModule>>
	GlobalLayout?: React.ComponentType<{ children: React.ReactNode }>
	notFound?: React.ReactNode
	loading?: React.ReactNode
	error?: React.ComponentType<{ error: unknown }>
}

/**
 * File-based router that renders pages and layouts with zero-flicker concurrent transitions.
 */
export function FileRouter(props: FileRouterProps) {
	const [loc, setLoc] = useState(() => ({
		pathname: typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '/',
		search: typeof window !== 'undefined' ? (window.location.search ?? '') : '',
		hash: typeof window !== 'undefined' ? (window.location.hash ?? '') : '',
	}))

	const [isPending, startTransition] = useTransition?.() ?? [false, reactStartTransition]
	const [isRouteLoading, setIsRouteLoading] = useState(false)

	const [loadedView, setLoadedView] = useState<LoadedRouteView | null>(null)
	const [loadError, setLoadError] = useState<unknown>(null)

	useEffect(() => {
		if (typeof window === 'undefined') return
		const onPop = () => {
			setLoc({
				pathname: normalizePathname(window.location.pathname),
				search: window.location.search ?? '',
				hash: window.location.hash ?? '',
			})
		}
		window.addEventListener('popstate', onPop)
		return () => window.removeEventListener('popstate', onPop)
	}, [])

	const navigate = (to: string, options?: NavigateOptions) => {
		if (typeof window === 'undefined') return
		const url = new URL(to, window.location.origin)
		const nextPath = normalizePathname(url.pathname)

		if (options?.replace) {
			window.history.replaceState({}, '', url.href)
		} else {
			window.history.pushState({}, '', url.href)
		}

		setLoc({
			pathname: nextPath,
			search: url.search ?? '',
			hash: url.hash ?? '',
		})
	}

	const prefetch = async (to: string): Promise<void> => {
		try {
			const url = new URL(to, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
			const targetPath = normalizePathname(url.pathname)
			const match = findMatchingRoute(props.routes, targetPath)
			if (!match) return

			const pageMod = await loadPageModule(match.route)
			const layoutName = resolveLayoutName(pageMod.layout)
			if (layoutName && props.layouts) {
				await loadLayoutModule(layoutName, props.layouts)
			}
		} catch {
			// Silent prefetch failure
		}
	}

	const match = useMemo(() => {
		return findMatchingRoute(props.routes, loc.pathname)
	}, [loc.pathname, props.routes])

	// Asynchronously load route & layout without clearing the previous screen
	useEffect(() => {
		let cancelled = false
		if (!match) {
			setLoadError(null)
			return
		}

		setIsRouteLoading(true)

		;(async () => {
			try {
				const pageMod = await loadPageModule(match.route)
				applyMetadata(pageMod.metadata)
				const layoutName = resolveLayoutName(pageMod.layout)

				let Layout: LoadedRouteView['Layout']
				if (layoutName && props.layouts) {
					const layoutMod = await loadLayoutModule(layoutName, props.layouts)
					if (layoutMod) {
						Layout = getDefaultExport(layoutMod)
					} else {
						console.warn(`[dex-router] unknown layout: ${layoutName}`)
					}
				}

				const Page = pageMod.default
				if (!Page) throw new Error(`Route module missing default export: ${match.route.file}`)

				if (!cancelled) {
					// Use startTransition to commit the new route view concurrently
					startTransition(() => {
						setLoadedView({
							file: match.route.file,
							path: match.route.path,
							Page,
							Layout,
						})
						setLoadError(null)
						setIsRouteLoading(false)
					})
				}
			} catch (err) {
				if (!cancelled) {
					setLoadError(err)
					setIsRouteLoading(false)
					console.error('[dex-router] failed to load route', err)
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [match?.route.file, props.layouts])

	const ctxValue: RouterState = useMemo(
		() => ({
			pathname: loc.pathname,
			search: loc.search,
			hash: loc.hash,
			params: match?.params ?? {},
			query: new URLSearchParams(loc.search),
			isNavigating: isPending || isRouteLoading,
			navigate,
			prefetch,
		}),
		[loc.pathname, loc.search, loc.hash, match?.params, isPending, isRouteLoading]
	)

	if (!match) {
		return (
			<RouterContext.Provider value={ctxValue}>
				{props.GlobalLayout ? <props.GlobalLayout>{props.notFound ?? <div>404</div>}</props.GlobalLayout> : (props.notFound ?? <div>404</div>)}
			</RouterContext.Provider>
		)
	}

	const GlobalLayout = props.GlobalLayout

	let body: React.ReactNode

	if (loadError) {
		body = props.error ? React.createElement(props.error, { error: loadError }) : <div>Failed to load route</div>
	} else if (!loadedView) {
		// Initial mount only: render loading placeholder if first route has not loaded yet
		body = props.loading ?? <div>Loading...</div>
	} else {
		const { Page, Layout } = loadedView
		const pageContent = <Page />
		body = Layout ? <Layout>{pageContent}</Layout> : pageContent
	}

	return (
		<RouterContext.Provider value={ctxValue}>
			{GlobalLayout ? <GlobalLayout>{body}</GlobalLayout> : body}
		</RouterContext.Provider>
	)
}

