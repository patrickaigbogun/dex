import { Database } from 'bun:sqlite'

export const db = new Database(process.env.DB_PATH || 'notes.sqlite', { create: true })

db.exec('PRAGMA journal_mode = WAL;')

db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export interface Note {
  id: number
  content: string
  created_at: string
}

export const notesRepo = {
  all: (): Note[] => db.query('SELECT * FROM notes ORDER BY id DESC').all() as Note[],
  create: (content: string): Note => {
    const res = db.query('INSERT INTO notes (content) VALUES (?) RETURNING *').get(content) as Note
    return res
  },
  delete: (id: number) => {
    db.run('DELETE FROM notes WHERE id = ?', [id])
  },
}
