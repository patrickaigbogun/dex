type RouteSegment = {
    kind: 'static';
    value: string;
} | {
    kind: 'param';
    name: string;
} | {
    kind: 'catchAll';
    name: string;
};
export declare function parseSegment(seg: string): RouteSegment;
export declare function fileToRoute(relPosixNoExt: string): {
    path: string;
    segments: RouteSegment[];
};
export declare function getSegmentScore(seg: RouteSegment): number;
export declare function compareRouteSegments(a: RouteSegment[], b: RouteSegment[]): number;
export declare function sortRoutesByPrecedence<T extends {
    segments: RouteSegment[];
    path: string;
}>(routes: T[]): T[];
export declare function fileToLayoutName(relPosixNoExt: string): string;
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
export {};
