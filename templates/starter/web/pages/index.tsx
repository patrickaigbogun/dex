import { Link } from '@dex/router/client'

export const metadata = { title: 'Dex Starter' }

export default function Page() {
	return (
		<main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
			<h1 className="text-3xl font-semibold">Dex Starter</h1>
			<p className="text-[var(--text-muted)]">
				This is a minimal Dex template app.
			</p>
			<Link className="underline" to="/about">
				Go to /about
			</Link>
		</main>
	)
}
