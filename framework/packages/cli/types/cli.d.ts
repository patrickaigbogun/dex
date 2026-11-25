export declare const DEFAULT_PACKAGES: string[];
export declare function parseArgs(argv: string[]): {
    positional: string[];
    flags: Record<string, string | boolean>;
};
export type TemplateDiff = {
    version: string;
    previousVersion: string | null;
    changedFiles: string[];
    deletedFiles?: string[];
    checksums?: Record<string, string>;
};
export declare function parseSHA256Sums(content: string): Record<string, string>;
export declare function validateTag(tag: string): string;
export declare function cachePathForTemplate(repo: string, tag: string, assetName: string): string;
export declare function cachePathForTemplateUrl(url: string): string;
export declare function safeJoin(destRoot: string, rel: string): string;
type SemverParts = [number, number, number];
export declare function parseSemverLikeTag(tag: string): {
    parts: SemverParts;
    strict: boolean;
} | null;
export declare function compareSemver(a: SemverParts, b: SemverParts): number;
export declare function formatSemverTag(parts: SemverParts): string;
export declare function bumpSemver(current: SemverParts, kind: 'patch' | 'minor' | 'major'): SemverParts;
export declare function findProjectRoot(startDir: string): Promise<{
    root: string;
    configPath: string;
} | null>;
export declare function resolveEnabledPackages(root: string): string[];
export {};
