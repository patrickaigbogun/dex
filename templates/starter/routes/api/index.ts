import { Elysia } from 'elysia'
import { healthRoutes } from './health'
import { testRoutes } from './test'

/**
 * Register API routes in a single compose step.
 */
export const apiRoutes = () =>
	new Elysia({ prefix: '/v1' }).use(healthRoutes).use(testRoutes)

