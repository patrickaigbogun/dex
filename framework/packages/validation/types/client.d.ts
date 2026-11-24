import { type Infer, type Schema, type ValidationResult } from './index';
export type UseValidatedOptions = {
    strict?: boolean;
};
/**
 * Validate current route params from `@dex/router/client` against `schema`.
 */
export declare function useValidatedParams<S extends Schema<any>>(schema: S, options: {
    strict: true;
}): Infer<S>;
export declare function useValidatedParams<S extends Schema<any>>(schema: S, options?: {
    strict?: false;
}): ValidationResult<Infer<S>>;
/**
 * Validate current URL query params from `@dex/router/client` against `schema`.
 */
export declare function useValidatedQuery<S extends Schema<any>>(schema: S, options: {
    strict: true;
}): Infer<S>;
export declare function useValidatedQuery<S extends Schema<any>>(schema: S, options?: {
    strict?: false;
}): ValidationResult<Infer<S>>;
