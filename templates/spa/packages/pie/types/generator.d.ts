export type GenerateApiOptions = {
    /** URL or local file path to OpenAPI specification (JSON or YAML) */
    spec: string | object;
    /** Output file path. Defaults to 'core/api/generated.ts' */
    outTs?: string;
    /** Root directory for path resolution */
    root?: string;
    /** Prefix to strip from route property tree (default: '/api') */
    prefix?: string;
    /** Default API base URL to embed in generated client helper */
    defaultBaseUrl?: string;
};
/**
 * Generate typed route tree and schema interfaces from an OpenAPI specification.
 */
export declare function generateApi(options: GenerateApiOptions): Promise<string>;
