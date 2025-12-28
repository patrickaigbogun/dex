import { Link } from '../../core/router/client/router'

export const metadata = {
	title: 'Fable',
}

export default function Page() {
	return (
		<main className="flex flex-col items-center w-full max-w-4xl mx-auto px-6 py-24 space-y-32">

			{/* 1. The Character & The Problem (Hero) */}
			<section className="text-center space-y-8 animate-in fade-in duration-1000">
				<p className="text-sm md:text-base text-[var(--primary)] font-bold tracking-[0.3em] uppercase">
					The Commonplace Book for Shared Destinies
				</p>
				<h1 className="text-6xl md:text-8xl font-serif text-[var(--text)] leading-tight">
					Don't let your <br/>
					<span className="italic text-[var(--text-muted)]">dreams drift.</span>
				</h1>
				<p className="text-xl text-[var(--text-muted)] font-serif max-w-xl mx-auto leading-relaxed">
					Life is noisy. Without a grounded space, shared goals dissolve into the chaos of daily chats and forgotten lists.
				</p>
			</section>

			{/* 2. The Guide (Fable) */}
			<section className="text-center space-y-6 max-w-2xl">
				<div className="w-px h-24 bg-[var(--border)] mx-auto opacity-50" />
				<h2 className="text-3xl md:text-4xl font-serif text-[var(--text)]">
					Enter Fable.
				</h2>
				<p className="text-lg text-[var(--text-muted)]">
					Your private, offline-first Ship's Log. A resilient artifact designed to help you chart the course and carry the cargo.
				</p>
			</section>

			{/* 3. The Plan (Features) */}
			<section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
				<FeatureCard 
					to="/vision" 
					subtitle="The Map" 
					title="The Vision Board" 
					desc="Align on the North Star. Where are we going?"
					delay="delay-100"
				/>
				<FeatureCard 
					to="/plan" 
					subtitle="The Cargo" 
					title="The Shared Plan" 
					desc="Track the resources. How do we survive the journey?"
					delay="delay-200"
				/>
			</section>

			{/* 4. Success / CTA */}
			<section className="text-center space-y-8 pb-24">
				<p className="text-2xl font-serif italic text-[var(--text)]">
					"We said we would do this, and look—we have done it."
				</p>
				<Link 
					to="/plan" 
					className="inline-block px-12 py-4 bg-[var(--primary)] text-[var(--bg)] font-bold tracking-widest uppercase hover:opacity-90 transition-opacity rounded-sm"
				>
					Start Your Log
				</Link>
			</section>

		</main>
	)
}

function FeatureCard({ to, title, subtitle, desc, delay }: { to: string, title: string, subtitle: string, desc: string, delay?: string }) {
	return (
		<Link 
			to={to} 
			className={`group flex flex-col p-12 bg-[var(--bg-light)] border border-[var(--border-muted)] hover:border-[var(--primary)] transition-all duration-500 rounded-sm text-left space-y-6 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards ${delay}`}
		>
			<span className="text-xs font-bold tracking-widest text-[var(--primary)] uppercase opacity-80">
				{subtitle}
			</span>
			<h3 className="text-4xl font-serif text-[var(--text)] group-hover:text-[var(--primary)] transition-colors duration-300">
				{title}
			</h3>
			<p className="text-base text-[var(--text-muted)] font-serif leading-relaxed">
				{desc}
			</p>
			<div className="pt-4 flex items-center text-[var(--text)] text-sm font-bold tracking-widest uppercase group-hover:gap-4 gap-2 transition-all">
				<span>Open</span>
				<span className="text-[var(--primary)]">→</span>
			</div>
		</Link>
	)
}