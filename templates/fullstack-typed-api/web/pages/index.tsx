import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface Task {
  id: string
  title: string
  completed: boolean
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadTasks() {
    try {
      const res = await api.api.tasks.get()
      if (res.data) {
        setTasks(res.data as Task[])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await api.api.tasks.post({ title })
    if (res.data) {
      setTasks([...tasks, res.data as Task])
      setTitle('')
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Fullstack Typed API Tasks</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Add Task
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading tasks...</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
            >
              <span className={task.completed ? 'line-through text-gray-400' : 'text-gray-800'}>
                {task.title}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                {task.completed ? 'Completed' : 'Active'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
