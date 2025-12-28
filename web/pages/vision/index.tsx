import { useEffect, useMemo, useState } from 'react'

import { BoardGuideline } from '@web/components/vision/BoardGuideline'
import { MilestonePin } from '@web/components/vision/MilestonePin'
import { PublicShareCard } from '@web/components/vision/PublicShareCard'

export const metadata = {
	title: 'Vision Board',
}

export const layout = 'dashboard'

const guidelineText = `# The Northstar

A fridge-door archive of what we’re building.

- Keep it warm
- Keep it simple
- Keep moving`

const milestones = [
	{ date: '2025-12-01', label: 'Started Fable' },
	{ date: '2026-01-15', label: 'First 30-day streak' },
	{ date: '2026-03-01', label: 'Emergency fund milestone' },
]

export default function VisionPage() {
	const [online, setOnline] = useState(() => navigator.onLine)
	const [shareEnabled, setShareEnabled] = useState(false)

	useEffect(() => {
		const on = () => setOnline(true)
		const off = () => {
			setOnline(false)
			setShareEnabled(false)
		}
		window.addEventListener('online', on)
		window.addEventListener('offline', off)
		return () => {
			window.removeEventListener('online', on)
			window.removeEventListener('offline', off)
		}
	}, [])

	const totalFunding = 250
	const totalTarget = 1000

	const shareLink = useMemo(() => 'fable.app/p/xyz', [])

	return (
		<main className="w-full p-4">
			<div className="mx-auto max-w-[1000px]">
				<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
					<BoardGuideline text={guidelineText} />

					<section className="col-span-full rounded-lg border border-[var(--border-muted)] bg-[var(--bg-light)] p-4">
						<h3 className="font-semibold text-[var(--text)]">Milestones</h3>
						<div className="mt-3">
							{milestones.map((m, idx) => (
								<MilestonePin
									key={m.date}
									date={m.date}
									label={m.label}
									isLast={idx === milestones.length - 1}
								/>
							))}
						</div>
					</section>

					<PublicShareCard
						online={online}
						enabled={shareEnabled}
						onEnabledChange={setShareEnabled}
						shareLink={shareLink}
						totalFunding={totalFunding}
						totalTarget={totalTarget}
					/>
				</div>
			</div>
		</main>
	)
}
