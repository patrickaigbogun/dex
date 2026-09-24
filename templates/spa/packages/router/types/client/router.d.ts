import React from 'react';
import type { LayoutModule, NavigateOptions, Params, PrefetchStrategy, Route, RouteContext, RouteSegment } from '../types';
type RouterState = RouteContext & {
    navigate: (to: string, options?: NavigateOptions) => void;
    prefetch: (to: string) => Promise<void>;
};
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
    to: string;
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
};
/**
 * File-based router that renders pages and layouts with zero-flicker concurrent transitions.
 */
export declare function FileRouter(props: FileRouterProps): import("react/jsx-runtime").JSX.Element;
export {};
