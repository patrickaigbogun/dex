import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import GlobalLayout from '@web/components/layout/global'


function App() {
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

const root = createRoot(document.getElementById('profile')!)
root.render(
<GlobalLayout>
    <App />
</GlobalLayout>
)