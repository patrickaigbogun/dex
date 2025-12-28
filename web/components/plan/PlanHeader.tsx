import clsx from 'clsx'

export function PlanHeader(props: { online: boolean }) {
	return (
		<header
			className={clsx(
				'sticky top-0 z-10',
				'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--bg)/0.8]',
				'-mx-4 px-4 py-3'
			)}
		>
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-[var(--text)]">Our Plan</h1>
				<div className="flex items-center gap-2">
					{!props.online ? (
						<span
							className="text-xs rounded-full px-2 py-1 bg-[var(--warning)] text-black"
						>
							Offline
						</span>
					) : null}
					<span
						aria-label={props.online ? 'Online' : 'Offline'}
						title={props.online ? 'Online' : 'Offline'}
						className={clsx(
							'h-2 w-2 rounded-full',
							props.online ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
						)}
					/>
				</div>
			</div>
		</header>
	)
}
