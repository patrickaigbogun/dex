import { useMemo, useState } from 'react'

import { Button } from '@base-ui/react/button'
import clsx from 'clsx'

import type { Target } from './types'

function clamp01(x: number) {
	if (Number.isNaN(x)) return 0
	return Math.min(1, Math.max(0, x))
}

export function TargetCard(props: {
	target: Target
	onAdd: (id: string, delta: number) => void
}) {
	const [deltaStr, setDeltaStr] = useState('')
	const progress = useMemo(() => {
		if (props.target.target <= 0) return 0
		return clamp01(props.target.current / props.target.target)
	}, [props.target.current, props.target.target])

	const badge = props.target.type === 'currency' ? 'Currency' : 'Points'
	const badgeClass =
		props.target.type === 'currency'
			? 'bg-[var(--primary)] text-black'
			: 'bg-[var(--secondary)] text-white'

	return (
		<section
			className={clsx(
				'rounded-lg border bg-[var(--bg-light)]',
				'border-[var(--border-muted)]'
			)}
		>
			<div className="flex items-center justify-between gap-3 p-4">
				<h3 className="font-semibold text-[var(--text)]">{props.target.title}</h3>
				<span className={clsx('px-2 py-1 rounded-full text-xs', badgeClass)}>
					{badge}
				</span>
			</div>

			<div className="px-4 pb-4">
				<div className="h-3 rounded-full bg-[var(--bg-dark)] overflow-hidden">
					<div
						className="h-full bg-[var(--primary)] transition-[width] duration-500 ease-out"
						style={{ width: `${Math.round(progress * 100)}%` }}
					/>
				</div>
				<div className="mt-2 flex items-center justify-between text-sm">
					<span className="text-[var(--text)]">Current: {props.target.current}</span>
					<span className="text-[var(--text-muted)]">Target: {props.target.target}</span>
				</div>
			</div>

			<div className="border-t border-[var(--border-muted)] p-3 flex items-center gap-2">
				<input
					type="number"
					inputMode="numeric"
					className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-muted)]"
					placeholder="Add amount..."
					value={deltaStr}
					onChange={(e) => setDeltaStr(e.target.value)}
				/>
				<Button
					className="h-9 w-9 rounded-md bg-[var(--highlight)] text-[var(--text)]"
					onClick={() => {
						const n = Number(deltaStr)
						if (!Number.isFinite(n) || n === 0) return
						props.onAdd(props.target.id, n)
						setDeltaStr('')
					}}
					type="button"
					aria-label="Add"
					title="Add"
				>
					+
				</Button>
			</div>
		</section>
	)
}
