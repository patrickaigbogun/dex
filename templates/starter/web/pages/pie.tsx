import { useEffect, useState } from 'react'
import { apiClient as api } from '@core/api'

export default function PiePage() {
	const [result, setResult] = useState<string>('loading…')

	useEffect(() => {
		let cancelled = false

		;(async () => {
			try {
				const res = await api.health.get()
				if (cancelled) return
				setResult(JSON.stringify(res, null, 2))
			} catch (err) {
				if (cancelled) return
				setResult(String(err))
			}
		})()

		return () => {
			cancelled = true
		}
	}, [])

	return (
		<div style={{ padding: 16 }}>
			<h1>Dex Pie</h1>
			<p>Typed Eden client via `@dex/pie`.</p>
			<pre>{result}</pre>
		</div>
	)
}
