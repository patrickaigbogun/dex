import React from 'react'

export function metadata() {
  return {
    title: 'About | Dex SSG',
    description: 'Learn more about Dex SSG template',
  }
}

export default function AboutPage() {
  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">About SSG</h1>
      <p className="text-gray-600 mb-6">
        Dex supports lightning-fast Static Site Generation with zero-config font optimization and metadata generation.
      </p>
      <a href="/" className="text-blue-600 hover:underline">&larr; Back to Home</a>
    </div>
  )
}
