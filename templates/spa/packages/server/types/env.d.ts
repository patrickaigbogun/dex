/**
 * Reads environment variables from .env and process.env, filtering for those
 * safe for client-side injection (prefixed with NEXT_PUBLIC_, PUBLIC_, or VITE_).
 * Returns an array of --define arguments for Bun build/spawn.
 */
export declare function getPublicEnvDefines(cwd?: string): string[];
