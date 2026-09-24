import type { Elysia } from 'elysia';
import type { Treaty } from '@elysiajs/eden';
import type { PieRetryOptions } from './types';
export type PieTreatyOptions = Omit<Treaty.Config, 'fetcher'> & {
    baseUrl?: string;
    pieFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    pieHeaders?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
    retry?: PieRetryOptions;
};
/**
 * Creates a typed Eden Treaty client with resilient retries and dynamic headers for Elysia backends.
 */
export declare function treatyPie<App extends Elysia<any, any, any, any, any, any, any>>(baseUrlOrOpts: string | (PieTreatyOptions & {
    baseUrl: string;
}), maybeOpts?: PieTreatyOptions): Treaty.Create<App>;
