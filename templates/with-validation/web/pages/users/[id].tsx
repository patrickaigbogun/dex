import React, { useEffect, useState } from 'react'
import { useValidatedParams, v } from '@dex/validation/client'

const userParamSchema = v.object({
  id: v.coerce.number({ min: 1, int: true }),
})

export default function UserDetailPage() {
  const { ok, data: params, issues } = useValidatedParams(userParamSchema)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok) return
    fetch(`/api/users/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('User not found')
        }
        return res.json()
      })
      .then(setUser)
      .catch((err) => setError(err.message))
  }, [ok, params])

  if (!ok) {
    return (
      <div className="max-w-xl mx-auto p-8 font-sans">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">User Detail</h1>
        <p className="text-red-600 font-medium">Invalid route parameters:</p>
        <pre className="bg-gray-100 p-4 rounded text-sm mt-2">{JSON.stringify(issues, null, 2)}</pre>
        <div className="mt-6">
          <a href="/" className="text-blue-600 hover:underline">&larr; Back to users</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">User Detail</h1>
      <p className="text-sm text-gray-600 mb-4">Validated Route Param ID: {params.id}</p>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : user ? (
        <div className="p-4 bg-white border rounded shadow-sm">
          <p className="font-semibold text-lg">{user.name}</p>
          <p className="text-gray-600">Email: {user.email}</p>
        </div>
      ) : (
        <p className="text-gray-500">Loading user...</p>
      )}
      <div className="mt-6">
        <a href="/" className="text-blue-600 hover:underline">&larr; Back to users</a>
      </div>
    </div>
  )
}
