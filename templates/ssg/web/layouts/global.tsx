import React from 'react'

export function metadata() {
  return {
    title: 'Dex SSG Application',
    description: 'Static Site Generation with Dex framework',
    openGraph: {
      title: 'Dex SSG Application',
      description: 'Static Site Generation with Dex framework',
      type: 'website',
    },
  }
}

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="border-b bg-white px-6 py-4 flex justify-between items-center">
        <a href="/" className="font-bold text-xl text-blue-600">Dex SSG</a>
        <div className="space-x-4">
          <a href="/" className="text-gray-600 hover:text-blue-600">Home</a>
          <a href="/about" className="text-gray-600 hover:text-blue-600">About</a>
        </div>
      </nav>
      <main className="py-8">{children}</main>
    </div>
  )
}
