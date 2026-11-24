import { Link } from '@dex/router/client'

export const metadata = { title: 'Test • Dex Starter', }

export const layout = 'test'

export default function Page() {
    return (
        <main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
            <h1 className="text-3xl font-semibold">Test 1</h1>
            <p className="text-[var(--text-muted)]">
                Routes come from files in <code>web/pages</code>.
            </p>
            <Link className="underline" to="/test">
                Back to Test
            </Link>
        </main>
    )
}
