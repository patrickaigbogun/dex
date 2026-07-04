import React from 'react';
import type { LayoutModule, Params, Route } from '../types';
/**
 * Access route params from the current match.
 */
export declare function useParams<T extends Params = Params>(): T;
/**
 * Access the current URL query params as URLSearchParams.
 */
export declare function useQuery(): URLSearchParams;
/**
 * Access the current location (pathname + search).
 */
export declare function useLocation(): {
    pathname: string;
    search: string;
};
/**
 * Programmatic navigation within the file router.
 */
export declare function useNavigate(): (to: string) => void;
/**
 * Client-side link that routes via the FileRouter context.
 */
export declare function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Client-only render boundary.
 *
 * Useful for SSG pages that contain “dynamic/island” components.
 * This avoids hydration mismatches by rendering `fallback` on the server
 * and on the initial client render, then switching to `children` after mount.
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
 * File-based router that renders pages and layouts by route match.
 */
export declare function FileRouter(props: FileRouterProps): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element;
