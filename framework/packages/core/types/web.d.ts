import type React from 'react';
export type MountAppOptions = {
    routes: any[];
    layouts?: any;
    GlobalLayout?: React.ComponentType<{
        children: React.ReactNode;
    }> | any;
    subdomains?: Record<string, string>;
    rootId?: string;
};
/**
 * Mount a Dex client application into the DOM using `<FileRouter />`.
 */
export declare function mountApp(opts: MountAppOptions): void;
