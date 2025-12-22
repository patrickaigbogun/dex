import { useState } from 'react'

export const metadata = {
	title: 'Home',
}

export default function Page() {
	const [count, setCount] = useState(0)
	const increase = () => setCount((c) => c + 1)

	return (
		<main>
			<h2>{count}</h2>
			<button
      className='
            bg-gray-700 p-3 rounded-md text-white
'
      onClick={increase}>
				Increase
			</button>
		</main>
	)
}