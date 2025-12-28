import { Markdown } from './Markdown'

export function BoardGuideline(props: { text: string }) {
	return (
		<section className="col-span-full rounded-lg border border-[var(--border)] bg-[var(--bg-dark)] p-4">
			<h2 className="text-lg font-semibold text-[var(--primary)]">The Vision</h2>
			<div className="mt-2 font-serif text-[var(--text)]">
				<Markdown text={props.text} />
			</div>
		</section>
	)
}
