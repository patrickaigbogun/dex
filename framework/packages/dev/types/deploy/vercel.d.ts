export type VercelBuildOptions = {
    rootDir: string;
    defineArgs?: string[];
    outDir?: string;
};
export type VercelConfigRoute = {
    src?: string;
    dest?: string;
    headers?: Record<string, string>;
    status?: number;
    handle?: string;
    continue?: boolean;
    has?: Array<{
        type: string;
        value: string;
    }>;
};
export type VercelBuildOutputConfig = {
    version: 3;
    routes: VercelConfigRoute[];
};
/**
 * Build a Dex application into Vercel Build Output API v3 format (.vercel/output).
 */
export declare function dexBuildVercel(opts: VercelBuildOptions): Promise<{
    outputDir: string;
    config: VercelBuildOutputConfig;
}>;
