import React, { useEffect, useState } from 'react'
import { api } from '../lib/auth'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      window.location.href = '/login'
      return
    }
    api.api.auth.me.get().then((res) => {
      if (!res.ok) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) {
    return <div className="p-8 text-gray-500">Checking authentication...</div>
  }

  return <>{children}</>
}
