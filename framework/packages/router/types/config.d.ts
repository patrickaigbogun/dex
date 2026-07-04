export type DexConfig = {
    mode?: string;
    port?: number;
    pagesDir?: string;
    layoutsDir?: string;
    outRoutesTs?: string;
    outRoutesJson?: string;
    outLayoutsTs?: string;
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
};
export declare function resolveFromRoot(root: string, input: string): string;
