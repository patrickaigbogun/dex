import React from 'react';
import type { LayoutModule, NavigateOptions, Params, PrefetchStrategy, Route, RouteContext, RouteSegment } from '../types';
export type RouterState = RouteContext & {
    navigate: (to: string, options?: NavigateOptions) => void;
    prefetch: (to: string) => Promise<void>;
    resolveHref: (to: string) => string;
};
export declare function resolveSubdomainMount(subdomains?: Record<string, string>): string | null;
export declare function toInternalPathname(browserPathname: string, mountPrefix: string | null): string;
export declare function toExternalPathname(pathname: string, mountPrefix: string | null): string;
export declare function toExternalHref(to?: string, mountPrefix?: string | null): string;
export declare function resolveMainDomainSubdomainRedirect(pathname: string, search: string, hash: string, subdomains?: Record<string, string>): string | null;
export declare const RouterContext: React.Context<RouterState | null>;
/**
 * Create a static RouterState for SSG/SSR prerendering so router hooks and <Link> work without a browser.
 */
export declare function createStaticRouterState(pathname: string, params?: Params): RouterState;
export declare function hasUnsafeScheme(to?: string): boolean;
export declare function normalizePathname(p: string): string;
export declare function splitPathname(pathname: string): string[];
export declare function matchRoute(segments: RouteSegment[], pathname: string): Params | null;
export declare function findMatchingRoute(routes: Route[], pathname: string): {
    route: Route;
    params: Params;
} | null;
/**
 * Access route params from the current match.
 */
export declare function useParams<T extends Params = Params>(): T;
/**
 * Access the current URL query params as a standard URLSearchParams object.
 */
export declare function useQuery(): URLSearchParams;
/**
 * Access the current location (pathname, search, hash).
 */
export declare function useLocation(): {
    pathname: string;
    search: string;
    hash: string;
};
/**
 * Returns true if a route transition is actively loading in the background.
 */
export declare function useIsNavigating(): boolean;
/**
 * Returns the entire current router state.
 */
export declare function useRouterState(): RouterState;
/**
 * Programmatic navigation within the file router.
 */
export declare function useNavigate(): (to: string, options?: NavigateOptions) => void;
/**
 * Prefetch a route ahead of time into memory.
 */
export declare function usePrefetch(): (to: string) => Promise<void>;
/**
 * Outlet component for nested layout rendering.
 */
export declare function Outlet<T = any>(props: {
    context?: T;
}): any;
/**
 * Access context passed to an `<Outlet context={...} />`.
 */
export declare function useOutletContext<T = any>(): T;
export type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    href?: string;
    replace?: boolean;
    prefetch?: PrefetchStrategy;
};
/**
 * Client-side link that routes via the FileRouter context with automatic prefetching.
 */
export declare function Link(props: LinkProps): import("react/jsx-runtime").JSX.Element;
/**
 * Client-only render boundary.
 *
 * Useful for SSG pages that contain dynamic/browser-only components.
 * Renders fallback on the server/initial paint, then switches to children after mount.
 */
export declare function ClientOnly(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Wrap a component so it only renders on the client.
 */
export declare function clientOnly<P extends {}>(Component: React.ComponentType<P>, fallback?: React.ReactNode): (props: P) => import("react/jsx-runtime").JSX.Element;
export type RouterErrorBoundaryProps = {
    children: React.ReactNode;
    fallback?: React.ComponentType<{
        error: unknown;
        reset: () => void;
    }>;
    resetKey?: string;
};
type RouterErrorBoundaryState = {
    hasError: boolean;
    error: unknown;
    prevResetKey?: string;
};
/**
 * Error boundary wrapping rendered router views and layouts.
 */
export declare class RouterErrorBoundary extends React.Component<RouterErrorBoundaryProps, RouterErrorBoundaryState> {
    constructor(props: RouterErrorBoundaryProps);
    static getDerivedStateFromError(error: unknown): Partial<RouterErrorBoundaryState>;
    static getDerivedStateFromProps(props: RouterErrorBoundaryProps, state: RouterErrorBoundaryState): Partial<RouterErrorBoundaryState> | null;
    componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void;
    reset: () => void;
    render(): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
/**
 * Props for the file-based router runtime.
 */
export type FileRouterProps = {
    routes: Route[];
    layouts?: Record<string, () => Promise<LayoutModule>>;
    GlobalLayout?: React.ComponentType<{
        children: React.ReactNode;
    }>;
    notFound?: React.ReactNode;
    loading?: React.ReactNode;
    error?: React.ComponentType<{
        error: unknown;
    }>;
    errorBoundary?: React.ComponentType<{
        error: unknown;
        reset: () => void;
    }>;
    subdomains?: Record<string, string>;
};
/**
 * File-based router that renders pages and layouts with zero-flicker concurrent transitions.
 */
export declare function FileRouter(props: FileRouterProps): import("react/jsx-runtime").JSX.Element;
export {};
