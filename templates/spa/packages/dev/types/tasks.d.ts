export type DexTaskOptions = {
    rootDir: string;
    defineArgs?: string[];
};
export declare function dexPrepareBuild({ rootDir }: DexTaskOptions): Promise<void>;
export declare function dexBuildClient({ rootDir, defineArgs }: DexTaskOptions): Promise<void>;
export declare function dexDev({ rootDir }: DexTaskOptions): Promise<void>;
export type DexPrerenderOptions = DexTaskOptions & {};
export declare function dexPrerender({ rootDir }: DexPrerenderOptions): Promise<void>;
