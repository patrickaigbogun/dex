type RouteFn<App, Next = any> = (app: App) => Next

type ComposeResult<App, Fns extends RouteFn<any, any>[]> = Fns extends [
	infer First,
	...infer Rest
]
	? First extends RouteFn<App, infer Next>
		? Rest extends RouteFn<any, any>[]
			? ComposeResult<Next, Rest>
			: Next
		: App
	: App

/**
 * Compose a list of route modules into a single app instance.
 *
 * Each route function should accept the current app and return it after
 * registering routes. This helper chains them in order.
 *
 * @example
 * ```ts
 * import { composeRoutes } from '@dex/router'
 * import health from './health'
 * import users from './users'
 *
 * export function apiRoutes() {
 *   return <const App extends Elysia>(app: App) => {
 *     return composeRoutes(app, [health, users])
 *   }
 * }
 * ```
 */
export function composeRoutes<App, Fns extends RouteFn<any, any>[]>(
	app: App,
	routes: [...Fns]
): ComposeResult<App, Fns> {
	return routes.reduce((acc, route) => route(acc), app) as ComposeResult<App, Fns>
}
