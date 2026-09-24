/**
 * Retry configuration for API requests.
 */
export type PieRetryOptions = {
    retries?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    jitter?: number;
    retryOnStatuses?: number[];
    retryOn?: (ctx: {
        attempt: number;
        response: Response | null;
        error: unknown | null;
    }) => boolean;
};
/**
 * Global configuration options for creating a Pie client instance.
 */
export type PieOptions = {
    baseUrl?: string;
    prefix?: string;
    headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    retry?: PieRetryOptions;
    onRequest?: (ctx: {
        url: string;
        init: RequestInit;
    }) => void | Promise<void>;
    onResponse?: (ctx: {
        response: Response;
        url: string;
    }) => void | Promise<void>;
    onError?: (ctx: {
        error: unknown;
        url: string;
    }) => void | Promise<void>;
};
/**
 * Standardized response envelope returned by all Pie method calls.
 */
export type PieResponse<T, E = unknown> = {
    data: T | null;
    error: E | null;
    status: number;
    ok: boolean;
    headers: Headers;
    response: Response;
};
/**
 * Options passed to individual HTTP method invocations (.get, .post, etc.).
 */
export type PieRequestOptions<B = any, Q = any> = {
    body?: B;
    query?: Q;
    headers?: Record<string, string>;
    /** Override base URL for one-off requests to other endpoints or microservices */
    baseUrl?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
};
/**
 * HTTP Method call signature.
 */
export type PieMethod<TData = any, TError = any, TBody = any, TQuery = any> = (options?: PieRequestOptions<TBody, TQuery>) => Promise<PieResponse<TData, TError>>;
/**
 * Recursive proxy route tree type mapping a schema definition to a navigable client.
 */
export type PieClient<Schema> = Schema extends (...args: infer Args) => infer R ? ((...args: Args) => PieClient<R>) & {
    [K in keyof Schema as K extends 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' ? never : K]: PieClient<Schema[K]>;
} & {
    get: Schema extends {
        get: (opts?: any) => infer Res;
    } ? Schema['get'] : PieMethod;
    post: Schema extends {
        post: (opts?: any) => infer Res;
    } ? Schema['post'] : PieMethod;
    put: Schema extends {
        put: (opts?: any) => infer Res;
    } ? Schema['put'] : PieMethod;
    delete: Schema extends {
        delete: (opts?: any) => infer Res;
    } ? Schema['delete'] : PieMethod;
    patch: Schema extends {
        patch: (opts?: any) => infer Res;
    } ? Schema['patch'] : PieMethod;
    head: Schema extends {
        head: (opts?: any) => infer Res;
    } ? Schema['head'] : PieMethod;
    options: Schema extends {
        options: (opts?: any) => infer Res;
    } ? Schema['options'] : PieMethod;
} : {
    [K in keyof Schema as K extends 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' ? never : K]: PieClient<Schema[K]>;
} & {
    get: Schema extends {
        get: (opts?: any) => infer Res;
    } ? Schema['get'] : PieMethod;
    post: Schema extends {
        post: (opts?: any) => infer Res;
    } ? Schema['post'] : PieMethod;
    put: Schema extends {
        put: (opts?: any) => infer Res;
    } ? Schema['put'] : PieMethod;
    delete: Schema extends {
        delete: (opts?: any) => infer Res;
    } ? Schema['delete'] : PieMethod;
    patch: Schema extends {
        patch: (opts?: any) => infer Res;
    } ? Schema['patch'] : PieMethod;
    head: Schema extends {
        head: (opts?: any) => infer Res;
    } ? Schema['head'] : PieMethod;
    options: Schema extends {
        options: (opts?: any) => infer Res;
    } ? Schema['options'] : PieMethod;
};
