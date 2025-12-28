import { Link } from '@dex/router/client'

export const metadata = { title: 'About • Dex Starter' }

export default function Page() {
	return (
		<main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
			<h1 className="text-3xl font-semibold">About</h1>
			<p className="text-[var(--text-muted)]">
				Routes come from files in <code>web/pages</code>.
			</p>
			<Link className="underline" to="/">
				Back home
			</Link>
		</main>
	)
}
