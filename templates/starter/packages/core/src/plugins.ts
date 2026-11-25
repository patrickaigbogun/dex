export type DexPlugin = {
	name: string
	onGenerate?: (ctx: { rootDir: string }) => void | Promise<void>
	onBeforeBuild?: (ctx: { rootDir: string }) => void | Promise<void>
	onAfterBuild?: (ctx: { rootDir: string; buildDir: string }) => void | Promise<void>
	onServer?: (app: any, ctx: { rootDir: string; mode: 'dev' | 'prod' }) => any | Promise<any>
}

export type DexPluginHookName = 'onGenerate' | 'onBeforeBuild' | 'onAfterBuild' | 'onServer'

/**
 * Execute a named lifecycle hook across all configured plugins in order.
 * For `onServer`, threads the returned app instance when a plugin returns a value.
 */
export async function runPluginHook<K extends DexPluginHookName>(
	plugins: DexPlugin[] | undefined,
	hookName: K,
	...args: Parameters<NonNullable<DexPlugin[K]>>
): Promise<K extends 'onServer' ? any : void> {
	if (!plugins || plugins.length === 0) {
		return (hookName === 'onServer' ? args[0] : undefined) as any
	}

	if (hookName === 'onServer') {
		let app = args[0]
		const ctx = args[1] as { rootDir: string; mode: 'dev' | 'prod' }
		for (const plugin of plugins) {
			const hook = plugin?.onServer
			if (typeof hook === 'function') {
				const nextApp = await hook(app, ctx)
				if (nextApp !== undefined) {
					app = nextApp
				}
			}
		}
		return app as any
	}

	for (const plugin of plugins) {
		const hook = plugin?.[hookName] as ((...hookArgs: any[]) => any) | undefined
		if (typeof hook === 'function') {
			await hook(...args)
		}
	}

	return undefined as any
}
