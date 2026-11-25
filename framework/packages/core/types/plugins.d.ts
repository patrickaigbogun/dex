export type DexPlugin = {
    name: string;
    onGenerate?: (ctx: {
        rootDir: string;
    }) => void | Promise<void>;
    onBeforeBuild?: (ctx: {
        rootDir: string;
    }) => void | Promise<void>;
    onAfterBuild?: (ctx: {
        rootDir: string;
        buildDir: string;
    }) => void | Promise<void>;
    onServer?: (app: any, ctx: {
        rootDir: string;
        mode: 'dev' | 'prod';
    }) => any | Promise<any>;
};
export type DexPluginHookName = 'onGenerate' | 'onBeforeBuild' | 'onAfterBuild' | 'onServer';
/**
 * Execute a named lifecycle hook across all configured plugins in order.
 * For `onServer`, threads the returned app instance when a plugin returns a value.
 */
export declare function runPluginHook<K extends DexPluginHookName>(plugins: DexPlugin[] | undefined, hookName: K, ...args: Parameters<NonNullable<DexPlugin[K]>>): Promise<K extends 'onServer' ? any : void>;
