import { useMemo } from 'react'

import { Switch } from '@base-ui/react/switch'
import clsx from 'clsx'

function clamp01(x: number) {
	if (Number.isNaN(x)) return 0
	return Math.min(1, Math.max(0, x))
}

export function PublicShareCard(props: {
	online: boolean
	enabled: boolean
	onEnabledChange: (next: boolean) => void
	shareLink: string
	totalFunding: number
	totalTarget: number
}) {
	const ratio = useMemo(() => {
		if (props.totalTarget <= 0) return 0
		return clamp01(props.totalFunding / props.totalTarget)
	}, [props.totalFunding, props.totalTarget])

	return (
		<section className="rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg-light)] p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="font-semibold text-[var(--text)]">Public Share</h3>
					<div className="text-xs text-[var(--text-muted)]">Share a read-only link</div>
				</div>

				<Switch.Root
					checked={props.enabled}
					onCheckedChange={props.onEnabledChange}
					disabled={!props.online}
					className={clsx(
						'relative inline-flex h-6 w-11 items-center rounded-full border',
						'border-[var(--border)]',
						props.enabled ? 'bg-[var(--success)]' : 'bg-[var(--bg-dark)]',
						!props.online ? 'opacity-50' : ''
					)}
				>
					<Switch.Thumb
						className={clsx(
							'block h-5 w-5 rounded-full bg-[var(--bg-light)]',
							'transform transition-transform duration-200',
							props.enabled ? 'translate-x-5' : 'translate-x-0.5'
						)}
					/>
				</Switch.Root>
			</div>

			{!props.online ? (
				<div className="mt-3 text-xs text-[var(--warning)]">Offline — sharing disabled</div>
			) : null}

			{props.enabled ? (
				<div className="mt-3">
					<label className="block text-xs text-[var(--text-muted)]">Link</label>
					<input
						readOnly
						className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none"
						value={props.shareLink}
					/>
				</div>
			) : null}

			<div className="mt-4">
				<div className="text-xs text-[var(--text-muted)]">Total funding</div>
				<div className="mt-2 h-3 rounded-full bg-[var(--bg-dark)] overflow-hidden">
					<div
						className="h-full bg-[var(--info)] transition-[width] duration-500 ease-out"
						style={{ width: `${Math.round(ratio * 100)}%` }}
					/>
				</div>
				<div className="mt-2 flex items-center justify-between text-sm">
					<span className="text-[var(--text)]">{props.totalFunding}</span>
					<span className="text-[var(--text-muted)]">{props.totalTarget}</span>
				</div>
			</div>
		</section>
	)
}
