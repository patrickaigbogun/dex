import type { PieRetryOptions } from './types';
export declare const DEFAULT_RETRY_METHODS: string[];
export type NormalizedRetryOptions = Required<PieRetryOptions> & {
    hasCustomRetryOn: boolean;
};
export declare function sleep(ms: number): Promise<unknown>;
export declare function computeDelayMs(opts: NormalizedRetryOptions, attempt: number): number;
export declare function normalizeRetryOptions(input?: PieRetryOptions): NormalizedRetryOptions;
export declare function shouldRetryAttempt(retry: NormalizedRetryOptions, ctx: {
    attempt: number;
    method: string;
    response: Response | null;
    error: unknown | null;
}): boolean;
