import { useId, useState } from 'react'

import { Button } from '@base-ui/react/button'
import { Dialog } from '@base-ui/react/dialog'

import type { TargetType } from './types'

export function CreateTargetModal(props: {
	onCreate: (data: { title: string; type: TargetType; target: number }) => void
}) {
	const titleId = useId()
	const [title, setTitle] = useState('')
	const [type, setType] = useState<TargetType>('currency')
	const [target, setTarget] = useState('')

	const canCreate = title.trim().length > 0 && Number(target) > 0

	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-[var(--primary)] shadow-lg text-black text-2xl"
					aria-label="Add target"
					title="Add target"
				>
					+
				</button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 bg-[color:var(--bg-dark)/0.8]" />
				<Dialog.Viewport className="fixed inset-0 flex items-end justify-center p-4">
					<Dialog.Popup
						className="w-full max-w-[600px] rounded-t-2xl border border-[var(--border)] bg-[var(--bg-light)]"
					>
						<div className="p-4 border-b border-[var(--border-muted)]">
							<Dialog.Title id={titleId} className="text-lg font-semibold text-[var(--text)]">
								Create Target
							</Dialog.Title>
							<Dialog.Description className="text-sm text-[var(--text-muted)]">
								Add a new target (mock).
							</Dialog.Description>
						</div>

						<div className="p-4 space-y-3">
							<label className="block">
								<span className="text-sm text-[var(--text-muted)]">Title</span>
								<input
									className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g. Emergency fund"
								/>
							</label>

							<div className="flex items-center gap-3">
								<label className="flex-1">
									<span className="text-sm text-[var(--text-muted)]">Type</span>
									<select
										className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none"
										value={type}
										onChange={(e) => setType(e.target.value as TargetType)}
									>
										<option value="currency">Currency</option>
										<option value="points">Points</option>
									</select>
								</label>
								<label className="flex-1">
									<span className="text-sm text-[var(--text-muted)]">Target</span>
									<input
										type="number"
										className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none"
										value={target}
										onChange={(e) => setTarget(e.target.value)}
										placeholder="1000"
									/>
								</label>
							</div>
						</div>

						<div className="p-4 border-t border-[var(--border-muted)] flex items-center justify-end gap-2">
							<Dialog.Close asChild>
								<Button
									type="button"
									className="rounded-md border border-[var(--border)] px-3 py-2 text-[var(--text)]"
								>
									Cancel
								</Button>
							</Dialog.Close>
							<Dialog.Close asChild>
								<Button
									type="button"
									disabled={!canCreate}
									className="rounded-md bg-[var(--primary)] px-3 py-2 text-black disabled:opacity-50"
									onClick={() => {
										props.onCreate({
											title: title.trim(),
											type,
											target: Number(target),
										})
										setTitle('')
										setTarget('')
									}}
								>
									Create
								</Button>
							</Dialog.Close>
						</div>
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
