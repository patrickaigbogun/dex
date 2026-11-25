export type DexTaskOptions = {
    rootDir: string;
    defineArgs?: string[];
    noWatch?: boolean;
};
export type ResolvedProjectPaths = {
    isLegacy: boolean;
    clientEntry: string;
    outRoutesTs: string;
    outRoutesJson: string;
    outLayoutsTs: string;
    serverDevEntry: string;
    serverProdEntry: string;
};
/**
 * Resolve project entrypoints and generated artifact paths, preserving legacy `core/` compatibility.
 */
export declare function resolveProjectPaths(rootDir: string): ResolvedProjectPaths;
export declare function dexPrepareBuild({ rootDir }: DexTaskOptions): Promise<void>;
export declare function dexBuildClient({ rootDir, defineArgs }: DexTaskOptions): Promise<void>;
export declare function dexBuild({ rootDir, defineArgs }: DexTaskOptions): Promise<void>;
export declare function dexDev({ rootDir, defineArgs, noWatch }: DexTaskOptions): Promise<void>;
export type DexPrerenderOptions = DexTaskOptions & {};
export declare function dexPrerender({ rootDir }: DexPrerenderOptions): Promise<void>;
