import { type DexCoreConfig } from './config';
export type ProdServerOptions = {
    rootDir?: string;
    config?: DexCoreConfig;
    apiModule?: any;
};
/**
 * Compose the Elysia production server for a Dex project with opt-in API and static build mounting.
 */
export declare function createProdServer(rootDirOrOpts?: string | ProdServerOptions): Promise<any>;
/**
 * Create and start listening with the Dex production server on an available port.
 */
export declare function startProdServer(rootDirOrOpts?: string | ProdServerOptions): Promise<any>;
