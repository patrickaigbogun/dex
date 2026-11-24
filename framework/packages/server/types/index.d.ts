import { Elysia } from 'elysia';
import { type DexFontsConfig } from './fonts';
/**
 * Serve static assets from a directory at `/assets/*`.
 */
export declare function dexAssetsRoute(opts: {
    assetsDir: string;
    cacheControlProd?: string;
    cacheControlDev?: string;
}): Elysia<"", {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {
    assets: {
        "*": {
            get: {
                body: unknown;
                params: {
                    "*": string;
                } & {};
                query: unknown;
                headers: unknown;
                response: {
                    200: "Bad asset path" | Bun.BunFile;
                    422: {
                        type: "validation";
                        on: string;
                        summary?: string;
                        message?: string;
                        found?: unknown;
                        property?: string;
                        expected?: string;
                    };
                };
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
export declare function dexDevReloadRouter(opts?: {
    watchFiles?: string[];
    watchDirs?: string[];
    pollIntervalMs?: number;
}): Elysia<"", {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {
    __dev: {
        reload: {
            get: {
                body: unknown;
                params: {};
                query: unknown;
                headers: unknown;
                response: {
                    200: Response;
                };
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
export interface DexHeadMeta {
    title?: string | null;
    description?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;
    ogVideo?: string | null;
    ogType?: string | null;
    url?: string | null;
    twitterCard?: 'summary' | 'summary_large_image' | 'player' | null;
}
/**
 * Inject head title, description, Open Graph, and Twitter metadata into HTML before </head>.
 */
export declare function injectHeadMeta(html: string, meta: DexHeadMeta): string;
/**
 * SPA fallback that serves prerendered SSG pages or the index HTML for non-asset GET requests.
 */
export declare function dexSpaFallback(opts: {
    indexHtmlPath: string;
    ssgDir?: string;
    subdomains?: Record<string, string>;
    fonts?: DexFontsConfig;
    trustProxy?: boolean;
    allowedHosts?: string[];
    resolveHead?: (ctx: {
        pathname: string;
        url: URL;
        hostname: string;
        request: Request;
    }) => Promise<DexHeadMeta | null> | DexHeadMeta | null;
}): Elysia<"", {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {
    "*": {
        get: {
            body: unknown;
            params: {
                "*": string;
            } & {};
            query: unknown;
            headers: unknown;
            response: {
                200: Response | Bun.BunFile | "Method Not Allowed" | "Not Found" | "Bad Path" | "Forbidden";
                422: {
                    type: "validation";
                    on: string;
                    summary?: string;
                    message?: string;
                    found?: unknown;
                    property?: string;
                    expected?: string;
                };
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
/**
 * Pretty request logger for Elysia apps.
 */
export declare function dexPrettyLogger(opts?: {
    ignore?: (pathname: string) => boolean;
    includeQuery?: boolean;
}): (app: Elysia) => Elysia<"", {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
export * from './env';
export * from './port';
export * from './fonts';
