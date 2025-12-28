import clsx from 'clsx'

export function MilestonePin(props: { date: string; label: string; isLast?: boolean }) {
	return (
		<div className="flex gap-3">
			<div className="flex flex-col items-center">
				<div className="h-2 w-2 rounded-full bg-[var(--secondary)]" />
				<div
					className={clsx(
						'w-px flex-1',
						props.isLast ? 'bg-transparent' : 'bg-[var(--border-muted)]'
					)}
				/>
			</div>
			<div className="pb-3">
				<div className="text-xs text-[var(--text-muted)]">{props.date}</div>
				<div className="text-sm text-[var(--text)]">{props.label}</div>
			</div>
		</div>
	)
}
