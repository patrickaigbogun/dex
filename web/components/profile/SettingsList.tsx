import { useMemo, useState } from 'react'

import { Button } from '@base-ui/react/button'

export function SettingsList() {
	const [bankName, setBankName] = useState('')
	const [account, setAccount] = useState('')

	const syncCode = useMemo(() => 'SYNC-XYZ-123', [])
	const emailVerified = false

	return (
		<section className="rounded-lg border border-[var(--border-muted)] bg-[var(--bg-light)]">
			<div className="p-4 border-b border-[var(--border-muted)]">
				<div className="flex items-center justify-between">
					<div className="font-semibold text-[var(--text)]">Benefactor Info</div>
					<div className="text-[var(--text-muted)]">›</div>
				</div>
				<div className="mt-3 grid grid-cols-1 gap-2">
					<input
						className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none"
						placeholder="Bank Name"
						value={bankName}
						onChange={(e) => setBankName(e.target.value)}
					/>
					<input
						className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none"
						placeholder="Account Number"
						value={account}
						onChange={(e) => setAccount(e.target.value)}
					/>
				</div>
			</div>

			<div className="p-4 border-b border-[var(--border-muted)]">
				<div className="flex items-center justify-between">
					<div className="font-semibold text-[var(--text)]">Sync / Invite</div>
					<div className="text-[var(--text-muted)]">›</div>
				</div>
				<div className="mt-3 flex items-center gap-2">
					<Button
						type="button"
						className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm text-black"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(syncCode)
							} catch {
								// ignore (mock)
							}
						}}
					>
						Copy Sync Code
					</Button>
					<span className="text-xs text-[var(--text-muted)]">Link</span>
				</div>
			</div>

			<div className="p-4">
				<div className="flex items-center justify-between">
					<div className="font-semibold text-[var(--text)]">Security</div>
					<div className="text-[var(--text-muted)]">›</div>
				</div>
				<div className="mt-3">
					{emailVerified ? (
						<span className="text-sm text-[var(--success)]">Verified</span>
					) : (
						<span className="inline-flex rounded-full bg-[var(--warning)] px-2 py-1 text-xs text-black">
							Verify Now
						</span>
					)}
				</div>
			</div>
		</section>
	)
}
