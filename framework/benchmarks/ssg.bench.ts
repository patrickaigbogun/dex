import React from 'react'
import { renderToString } from 'react-dom/server'
import { performance } from 'node:perf_hooks'
import { RouterContext, createStaticRouterState, Link, useLocation } from '../packages/router/src/client/router'
import { injectHeadMeta } from '../packages/server/src/index'
import { injectGoogleFonts } from '../packages/server/src/fonts'

export type SsgBenchResult = {
	pagesRendered: number
	totalMs: number
	pagesPerSec: number
	peakRssMb: number
}

const TEMPLATE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Dex App</title>
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/client.js"></script>
  </body>
</html>`

function SamplePage({ index }: { index: number }) {
	const { pathname } = useLocation()
	return React.createElement(
		'article',
		{ className: 'prose' },
		React.createElement('h1', null, `Article #${index}`),
		React.createElement('p', null, `Rendered statically at ${pathname}`),
		React.createElement(Link, { to: `/articles/${index + 1}` }, 'Next article')
	)
}

function SampleLayout({ children }: { children: React.ReactNode }) {
	return React.createElement(
		'div',
		{ className: 'shell' },
		React.createElement('header', null, 'Dex Benchmark'),
		React.createElement('main', null, children)
	)
}

export async function runSsgBench(): Promise<SsgBenchResult> {
	const pagesRendered = 500
	const fonts = { sans: 'Inter', mono: 'JetBrains Mono' }
	let peakRss = process.memoryUsage().rss

	const start = performance.now()
	for (let i = 0; i < pagesRendered; i++) {
		const routePath = `/articles/${i}`
		const tree = React.createElement(
			RouterContext.Provider,
			{ value: createStaticRouterState(routePath, { id: String(i) }) },
			React.createElement(SampleLayout, null, React.createElement(SamplePage, { index: i }))
		)
		const rendered = renderToString(tree)
		let html = TEMPLATE_HTML.replace('<div id="root"></div>', () => `<div id="root">${rendered}</div>`)
		html = injectHeadMeta(html, {
			title: `Article #${i} — Dex`,
			description: `Static benchmark page ${i}`,
			ogType: 'article',
		})
		html = injectGoogleFonts(html, fonts)
		if (html.length === 0) throw new Error('Unexpected empty HTML')

		if (i % 100 === 0) {
			const rss = process.memoryUsage().rss
			if (rss > peakRss) peakRss = rss
		}
	}
	const totalMs = Number((performance.now() - start).toFixed(2))
	const endRss = process.memoryUsage().rss
	if (endRss > peakRss) peakRss = endRss

	return {
		pagesRendered,
		totalMs,
		pagesPerSec: Math.round((pagesRendered / totalMs) * 1000),
		peakRssMb: Number((peakRss / (1024 * 1024)).toFixed(1)),
	}
}
