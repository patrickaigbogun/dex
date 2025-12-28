export function WalletCard(props: { total: number }) {
	return (
		<section
			className="w-full rounded-xl border border-[var(--primary)] bg-gradient-to-br from-[var(--bg-dark)] to-[var(--bg)] p-4"
		>
			<div className="text-xs text-[var(--text-muted)]">Total Available Funds</div>
			<div className="mt-2 text-3xl font-semibold text-[var(--text)]">{props.total}</div>
			<div className="mt-1 text-sm text-[var(--info)]">Held in Fable Bridge</div>
		</section>
	)
}
