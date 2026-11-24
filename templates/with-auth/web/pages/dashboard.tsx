import React, { useEffect, useState } from 'react'
import { api } from '../../lib/auth'

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    api.api.auth.me.get().then((res) => {
      if (!res.ok) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
        return
      }
      if (res.data) setMe(res.data)
    })
  }, [])

  function logout() {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      {me ? (
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <p className="text-lg font-medium text-gray-800">Welcome, {me.user?.username}!</p>
          <p className="text-sm text-gray-500 mt-1">You have successfully accessed a protected route.</p>
        </div>
      ) : (
        <p className="text-gray-500">Loading user info...</p>
      )}
    </div>
  )
}
