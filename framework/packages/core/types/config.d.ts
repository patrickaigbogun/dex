import type { DexPlugin } from './plugins';
export type DexRenderStrategy = 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic';
export type DexRouterConfig = {
    pagesDir?: string;
    layoutsDir?: string;
    outRoutesTs?: string;
    outRoutesJson?: string;
    outLayoutsTs?: string;
};
export type DexServerConfig = {
    port?: number;
    trustProxy?: boolean;
    allowedHosts?: string[];
    watchFiles?: string[];
    watchDirs?: string[];
};
export type DexApiConfig = {
    spec?: string;
    url?: string;
    outTs?: string;
    prefix?: string;
    apiSpec?: string;
    apiUrl?: string;
    outApiTs?: string;
    apiPrefix?: string;
};
export type DexBuildConfig = {
    outDir?: string;
    target?: string;
    minify?: boolean;
    splitting?: boolean;
    sourcemap?: boolean | 'inline' | 'external' | 'linked' | 'none';
};
export type DexCoreConfig = {
    mode?: string;
    port?: number;
    renderStrategy?: DexRenderStrategy;
    router?: DexRouterConfig;
    server?: DexServerConfig;
    api?: DexApiConfig;
    build?: DexBuildConfig;
    subdomains?: Record<string, string>;
    fonts?: Record<string, any>;
    plugins?: DexPlugin[];
    pagesDir?: string;
    layoutsDir?: string;
    outRoutesTs?: string;
    outRoutesJson?: string;
    outLayoutsTs?: string;
    apiSpec?: string;
    apiUrl?: string;
    outApiTs?: string;
    apiPrefix?: string;
    watchFiles?: string[];
    watchDirs?: string[];
    devWatchFiles?: string[];
    devWatchDirs?: string[];
};
/** Define a full Dex project configuration. */
export declare function defineConfig(config: DexCoreConfig): DexCoreConfig;
/** Define router-specific configuration. */
export declare function defineRouterConfig(config: DexRouterConfig): DexRouterConfig;
/** Define server-specific configuration. */
export declare function defineServerConfig(config: DexServerConfig): DexServerConfig;
/** Define API / Pie codegen configuration. */
export declare function defineApiConfig(config: DexApiConfig): DexApiConfig;
/** Define build-specific configuration. */
export declare function defineBuildConfig(config: DexBuildConfig): DexBuildConfig;
/**
 * Load and normalize the project's Dex configuration from `rootDir`.
 * Prefers `config/core/index.{ts,js,mjs,json}` before legacy `dex.config.*` and `config/dex.config.*`.
 */
export declare function loadProjectConfig(rootDir?: string): Promise<DexCoreConfig>;
