import React, { useState } from 'react'

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <>{children}</>
}

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center gap-4">
      <span className="font-medium text-blue-900">Interactive Island Count: {count}</span>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
      >
        Increment
      </button>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h1 className="text-4xl font-extrabold mb-4 text-gray-900">Static Site Generation (SSG)</h1>
      <p className="text-lg text-gray-600 mb-6">
        This page was statically pre-rendered at build time with full OpenGraph metadata support.
      </p>
      <ClientOnly>
        <Counter />
      </ClientOnly>
    </div>
  )
}
