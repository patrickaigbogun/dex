import type { Elysia } from 'elysia';
/**
 * Single field or value validation issue.
 */
export type ValidationIssue = {
    path: (string | number)[];
    message: string;
};
/**
 * Result returned by `safeValidate`.
 */
export type ValidationResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    issues: ValidationIssue[];
};
/**
 * Error thrown by `validate`, `validateParams`, `validateQuery`, and `validateBody` on failure.
 */
export declare class ValidationError extends Error {
    readonly status = 422;
    readonly issues: ValidationIssue[];
    constructor(issues: ValidationIssue[], message?: string);
}
/**
 * Standard Schema v1 interface (https://standardschema.dev).
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
    readonly '~standard': {
        readonly version: 1;
        readonly vendor: string;
        readonly validate: (value: unknown) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
        readonly types?: {
            readonly input: Input;
            readonly output: Output;
        };
    };
}
export type StandardSchemaV1Result<Output> = {
    readonly value: Output;
    readonly issues?: undefined;
} | {
    readonly issues: ReadonlyArray<StandardSchemaV1Issue>;
};
export interface StandardSchemaV1Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | {
        readonly key: PropertyKey;
    }>;
}
/**
 * Zod-compatible schema shape (`safeParse` / `parse`).
 */
export interface ZodLikeSchema<Output = unknown> {
    safeParse: (input: unknown) => {
        success: true;
        data: Output;
    } | {
        success: false;
        error: {
            message?: string;
            issues?: ReadonlyArray<{
                path?: ReadonlyArray<PropertyKey>;
                message: string;
            }>;
            errors?: ReadonlyArray<{
                path?: ReadonlyArray<PropertyKey>;
                message: string;
            }>;
        };
    };
    parse?: (input: unknown) => Output;
}
/**
 * Built-in `@dex/validation` schema with Standard Schema v1 and Zod-like compatibility.
 */
export interface DexSchema<TOutput> extends StandardSchemaV1<unknown, TOutput>, ZodLikeSchema<TOutput> {
    parse: (input: unknown) => TOutput;
    optional: () => DexSchema<TOutput | undefined>;
    default: (value: Exclude<TOutput, undefined>) => DexSchema<Exclude<TOutput, undefined>>;
}
/**
 * Supported schema types: built-in `v.*`, Standard Schema v1 (Valibot, ArkType, Zod v4), or Zod-like.
 */
export type Schema<TOutput = unknown> = DexSchema<TOutput> | StandardSchemaV1<unknown, TOutput> | ZodLikeSchema<TOutput> | {
    parse: (input: unknown) => TOutput;
};
/**
 * Infer the output TypeScript type of any supported schema.
 */
export type Infer<S> = S extends DexSchema<infer O> ? O : S extends StandardSchemaV1<any, infer O> ? O : S extends {
    safeParse: (input: unknown) => {
        success: true;
        data: infer O;
    } | {
        success: false;
        error: any;
    };
} ? O : S extends {
    parse: (input: unknown) => infer O;
} ? O : never;
/**
 * Validate `input` against `schema` without throwing.
 */
export declare function safeValidate<S extends Schema<any>>(schema: S, input: unknown): ValidationResult<Infer<S>>;
/**
 * Validate `input` against `schema`, throwing `ValidationError` (status 422) on failure.
 */
export declare function validate<S extends Schema<any>>(schema: S, input: unknown): Infer<S>;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type InferShape<Shape extends Record<string, Schema<any>>> = {
    [K in keyof Shape]: Infer<Shape[K]>;
};
type OptionalShapeKeys<T extends Record<string, unknown>> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];
type RequiredShapeKeys<T extends Record<string, unknown>> = Exclude<keyof T, OptionalShapeKeys<T>>;
export type ObjectOutput<Shape extends Record<string, Schema<any>>> = Prettify<{
    [K in RequiredShapeKeys<InferShape<Shape>>]: InferShape<Shape>[K];
} & {
    [K in OptionalShapeKeys<InferShape<Shape>>]?: InferShape<Shape>[K];
}>;
export type StringOptions = {
    min?: number;
    max?: number;
    pattern?: RegExp;
};
export type NumberOptions = {
    min?: number;
    max?: number;
    int?: boolean;
};
/**
 * Lightweight built-in schema builder compatible with Standard Schema v1.
 */
export declare const v: {
    string(opts?: StringOptions): DexSchema<string>;
    number(opts?: NumberOptions): DexSchema<number>;
    boolean(): DexSchema<boolean>;
    coerce: {
        number(opts?: NumberOptions): DexSchema<number>;
        boolean(): DexSchema<boolean>;
    };
    enum<const T extends readonly [string, ...string[]] | readonly (string | number)[]>(values: T): DexSchema<T[number]>;
    array<S extends Schema<any>>(itemSchema: S): DexSchema<Infer<S>[]>;
    object<Shape extends Record<string, Schema<any>>>(shape: Shape): DexSchema<ObjectOutput<Shape>>;
};
/**
 * Convert a `URL`, `URLSearchParams`, query/URL string, or plain record into a plain object for validation.
 */
export declare function normalizeQueryInput(input: URL | URLSearchParams | string | Record<string, unknown>): Record<string, unknown>;
/**
 * Validate route params against `schema`.
 */
export declare function validateParams<S extends Schema<any>>(schema: S, params: unknown): Infer<S>;
/**
 * Validate query parameters from a `URL`, `URLSearchParams`, URL/query string, or plain object.
 */
export declare function validateQuery<S extends Schema<any>>(schema: S, urlOrSearchParams: URL | URLSearchParams | string | Record<string, unknown>): Infer<S>;
/**
 * Validate request body against `schema`.
 */
export declare function validateBody<S extends Schema<any>>(schema: S, body: unknown): Infer<S>;
type InferOrUndefined<S> = S extends Schema<any> ? Infer<S> : undefined;
export type DexValidatedData<TParams extends Schema<any> | undefined = undefined, TQuery extends Schema<any> | undefined = undefined, TBody extends Schema<any> | undefined = undefined> = {
    params: InferOrUndefined<TParams>;
    query: InferOrUndefined<TQuery>;
    body: InferOrUndefined<TBody>;
};
/**
 * Elysia middleware/guard helper that validates `params`, `query`, and `body`.
 * Returns HTTP 422 `{ error: 'Validation failed', issues }` on failure and attaches `validated` on success.
 */
export declare function dexValidate<TParams extends Schema<any> | undefined = undefined, TQuery extends Schema<any> | undefined = undefined, TBody extends Schema<any> | undefined = undefined>(schemas: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
}): <TApp extends Elysia<any, any, any, any, any, any, any>>(app: TApp) => Elysia<any, any, {
    typebox: any;
    error: any;
}, any, any, any, {
    derive: any;
    resolve: any;
    schema: any;
    standaloneSchema: any;
    response: {
        200: {
            error: string;
            issues: ValidationIssue[];
        };
    };
}>;
export {};
