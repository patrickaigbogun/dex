import { ThemeToggle } from '@web/components/theme-toggle'

export const metadata = {
	title: 'Profile Settings',
}

export const layout = 'dashboard'

export default function Page() {
	return (
		<main className="p-4 space-y-4 w-full max-w-md">
			<h1 className="text-2xl font-bold">Settings</h1>
			<div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
				<span>Theme</span>
				<ThemeToggle />
			</div>
		</main>
	)
}
