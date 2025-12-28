import { useEffect, useState } from 'react'

import { PlanHeader } from '@web/components/plan/PlanHeader'
import { CreateTargetModal } from '@web/components/plan/CreateTargetModal'
import { TargetCard } from '@web/components/plan/TargetCard'
import type { Target } from '@web/components/plan/types'

export const metadata = {
	title: 'Shared Plan',
}

export const layout = 'dashboard'

const initialTargets: Target[] = [
	{ id: 't1', title: 'Emergency Fund', type: 'currency', current: 250, target: 1000 },
	{ id: 't2', title: 'Reading Streak', type: 'points', current: 12, target: 30 },
]

export default function PlanPage() {
	const [online, setOnline] = useState(() => navigator.onLine)
	const [targets, setTargets] = useState<Target[]>(() => initialTargets)

	useEffect(() => {
		const on = () => setOnline(true)
		const off = () => setOnline(false)
		window.addEventListener('online', on)
		window.addEventListener('offline', off)
		return () => {
			window.removeEventListener('online', on)
			window.removeEventListener('offline', off)
		}
	}, [])

	const addToTarget = (id: string, delta: number) => {
		// Optimistic: update UI immediately.
		setTargets((prev) =>
			prev.map((t) => (t.id === id ? { ...t, current: t.current + delta } : t))
		)
	}

	return (
		<main className="w-full max-w-[600px] p-4">
			<PlanHeader online={online} />

			<div className="space-y-3">
				{targets.map((t) => (
					<TargetCard key={t.id} target={t} onAdd={addToTarget} />
				))}
			</div>

			{/* Floating action button + sheet */}
			<CreateTargetModal
				onCreate={(data) => {
					setTargets((prev) => [
						...prev,
						{
							id: `t${prev.length + 1}`,
							title: data.title,
							type: data.type,
							current: 0,
							target: data.target,
						},
					])
				}}
			/>
		</main>
	)
}
