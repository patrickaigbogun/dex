import React from 'react'

export function Markdown(props: { text: string }) {
	const lines = props.text.split(/\r?\n/)
	const blocks: React.ReactNode[] = []

	let currentList: string[] | null = null
	const flushList = () => {
		if (!currentList || currentList.length === 0) return
		blocks.push(
			<ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1">
				{currentList.map((item, idx) => (
					<li key={idx}>{item}</li>
				))}
			</ul>
		)
		currentList = null
	}

	for (const raw of lines) {
		const line = raw.trim()
		if (!line) {
			flushList()
			continue
		}

		if (line.startsWith('- ')) {
			currentList ??= []
			currentList.push(line.slice(2))
			continue
		}

		flushList()

		if (line.startsWith('### ')) {
			blocks.push(
				<h3 key={`h3-${blocks.length}`} className="text-base font-semibold">
					{line.slice(4)}
				</h3>
			)
			continue
		}
		if (line.startsWith('## ')) {
			blocks.push(
				<h2 key={`h2-${blocks.length}`} className="text-lg font-semibold">
					{line.slice(3)}
				</h2>
			)
			continue
		}
		if (line.startsWith('# ')) {
			blocks.push(
				<h1 key={`h1-${blocks.length}`} className="text-xl font-semibold">
					{line.slice(2)}
				</h1>
			)
			continue
		}

		blocks.push(
			<p key={`p-${blocks.length}`} className="text-sm leading-relaxed">
				{line}
			</p>
		)
	}

	flushList()

	return <div className="space-y-2">{blocks}</div>
}
