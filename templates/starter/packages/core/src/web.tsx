import type React from 'react'
import { createRoot } from 'react-dom/client'
import { FileRouter } from '@dex/router/client'

export type MountAppOptions = {
	routes: any[]
	layouts?: any
	GlobalLayout?: React.ComponentType<{ children: React.ReactNode }> | any
	subdomains?: Record<string, string>
	rootId?: string
}

/**
 * Mount a Dex client application into the DOM using `<FileRouter />`.
 */
export function mountApp(opts: MountAppOptions): void {
	const rootId = opts.rootId ?? 'root'
	const el = document.getElementById(rootId)
	if (!el) throw new Error(`Missing <div id="${rootId}"></div>`)

	createRoot(el).render(
		<FileRouter
			routes={opts.routes}
			layouts={opts.layouts}
			GlobalLayout={opts.GlobalLayout}
			subdomains={opts.subdomains}
		/>
	)
}
