import { ClientOnly, Link } from '@dex/router/client'

export const metadata = {
	title: 'Rendering Strategies',
	description: 'SSG + client-only islands example',
}

// Explicit per-page override: prerender this route even if app default is SPA.
export const render = 'ssg'

function Now() {
	return <span>{new Date().toLocaleTimeString()}</span>
}

export default function RenderingPage() {
	return (
		<div style={{ padding: 16 }}>
			<h1>Rendering strategies</h1>
			<p>
				This page is pre-rendered (SSG). The clock below is client-only to avoid
				hydration issues.
			</p>

			<p>
				Client-only island:{' '}
				<ClientOnly fallback={<span>(loading…)</span>}>
					<Now />
				</ClientOnly>
			</p>

			<p>
				<Link to="/">Back home</Link>
			</p>
		</div>
	)
}
