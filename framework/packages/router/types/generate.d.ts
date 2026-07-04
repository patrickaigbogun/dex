/**
 * Generate layout loader map from the layouts directory.
 */
export declare function generateLayouts(opts?: {
    layoutsDir?: string;
    outTs?: string;
}): Promise<void>;
/**
 * Generate file-system based routes from the pages directory.
 */
export declare function generateFsRoutes(opts?: {
    pagesDir?: string;
    outTs?: string;
    outJson?: string;
}): Promise<void>;
/**
 * Watch pages/layouts and regenerate routes on change.
 */
export declare function watchAndGenerate(opts?: {
    pagesDir?: string;
    layoutsDir?: string;
    outRoutesTs?: string;
    outRoutesJson?: string;
    outLayoutsTs?: string;
}): Promise<void>;
