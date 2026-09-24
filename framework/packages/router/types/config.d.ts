export type DexConfig = {
    mode?: string;
    port?: number;
    renderStrategy?: 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic';
    pagesDir?: string;
    layoutsDir?: string;
    outRoutesTs?: string;
    outRoutesJson?: string;
    outLayoutsTs?: string;
    apiSpec?: string;
    apiUrl?: string;
    outApiTs?: string;
    apiPrefix?: string;
};
export declare function loadDexConfig(startDir?: string): Promise<{
    config: DexConfig;
    root: string;
}>;
export declare const DEFAULT_PATHS: {
    readonly pagesDir: "web/pages";
    readonly layoutsDir: "web/layouts";
    readonly outRoutesTs: "core/router/.generated/routes.ts";
    readonly outRoutesJson: "core/router/.generated/manifest.json";
    readonly outLayoutsTs: "core/router/.generated/layouts.ts";
    readonly outApiTs: "core/api/generated.ts";
    readonly apiPrefix: "/api";
};
export declare function resolveFromRoot(root: string, input: string): string;
