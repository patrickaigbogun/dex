export type DeployProvider = 'vercel' | 'netlify' | 'cloudflare' | 'railway' | 'render' | 'docker';
/**
 * Prepare deployment artifacts and configuration files for a target provider.
 */
export declare function dexPrepareProvider(opts: {
    rootDir: string;
    provider: DeployProvider;
}): Promise<{
    filesWritten: string[];
}>;
