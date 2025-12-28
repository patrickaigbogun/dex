import { Link, useLocation } from '../../../core/router/client/router'
import clsx from 'clsx'

export function NavBar() {
	const { pathname: currentPath } = useLocation()

	const navItems = [
		{ label: 'Plan', path: '/plan', icon: <PlanIcon /> },
		{ label: 'Vision', path: '/vision', icon: <VisionIcon /> },
		{ label: 'Profile', path: '/profile', icon: <ProfileIcon /> },
	]

	return (
		<nav className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--bg)] pb-safe z-50">
			<div className="flex items-center justify-around h-16 max-w-md mx-auto">
				{navItems.map((item) => {
					const isActive = currentPath.startsWith(item.path)
					return (
						<Link
							key={item.path}
							to={item.path}
							className={clsx(
								'flex flex-col items-center justify-center w-full h-full space-y-1',
								'text-xs font-medium transition-colors',
								isActive
									? 'text-[var(--primary)]'
									: 'text-[var(--text-muted)] hover:text-[var(--text)]'
							)}
						>
							{item.icon}
							<span>{item.label}</span>
						</Link>
					)
				})}
			</div>
		</nav>
	)
}

function PlanIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
			<line x1="16" x2="16" y1="2" y2="6" />
			<line x1="8" x2="8" y1="2" y2="6" />
			<line x1="3" x2="21" y1="10" y2="10" />
			<path d="m9 16 2 2 4-4" />
		</svg>
	)
}

function VisionIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
		</svg>
	)
}

function ProfileIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	)
}
