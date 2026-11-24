import React, { useEffect, useState } from 'react'
import { useValidatedQuery, v } from '@dex/validation/client'

const listQuerySchema = v.object({
  page: v.coerce.number({ min: 1, int: true }).default(1),
  limit: v.coerce.number({ min: 1, max: 100, int: true }).default(10),
})

export default function UsersIndexPage() {
  const { ok, data: query, issues } = useValidatedQuery(listQuerySchema)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (!ok) return
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(query.limit),
    })
    fetch(`/api/users?${params}`)
      .then((res) => res.json())
      .then(setUsers)
  }, [ok, query])

  if (!ok) {
    return (
      <div className="max-w-xl mx-auto p-8 font-sans">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Users (Validation Demo)</h1>
        <p className="text-red-600 font-medium">Invalid query parameters:</p>
        <pre className="bg-gray-100 p-4 rounded text-sm mt-2">{JSON.stringify(issues, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Users (Validation Demo)</h1>
      <p className="text-sm text-gray-600 mb-4">Current query params: {JSON.stringify(query)}</p>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="p-4 bg-white border rounded shadow-sm flex justify-between">
            <a href={`/users/${user.id}`} className="text-blue-600 font-medium hover:underline">
              {user.name} ({user.email})
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
