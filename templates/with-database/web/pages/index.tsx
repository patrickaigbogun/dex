import React, { useEffect, useState } from 'react'

interface Note {
  id: number
  content: string
  created_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')

  async function loadNotes() {
    const res = await fetch('/api/notes')
    const data = await res.json()
    setNotes(data)
  }

  useEffect(() => {
    loadNotes()
  }, [])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setContent('')
    loadNotes()
  }

  async function deleteNote(id: number) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    loadNotes()
  }

  return (
    <div className="max-w-xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">SQLite Notes</h1>

      <form onSubmit={addNote} className="flex gap-2 mb-6">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Add Note
        </button>
      </form>

      <ul className="space-y-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
          >
            <div>
              <p className="text-gray-800">{note.content}</p>
              <span className="text-xs text-gray-400">{note.created_at}</span>
            </div>
            <button
              onClick={() => deleteNote(note.id)}
              className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm font-medium hover:bg-red-200"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
