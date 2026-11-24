import React, { useState } from 'react'
import { api } from '../../lib/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = await api.api.auth.login.post({ username, password })
    if (res.data && (res.data as any).token) {
      localStorage.setItem('auth_token', (res.data as any).token)
      window.location.href = '/dashboard'
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white border rounded-lg shadow-sm font-sans">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Sign In</h1>
      {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
        >
          Sign In
        </button>
      </form>
    </div>
  )
}
