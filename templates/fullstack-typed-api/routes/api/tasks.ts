import { Elysia } from 'elysia'
import { v, validateBody } from '@dex/validation'

export interface Task {
  id: string
  title: string
  completed: boolean
}

const tasks: Task[] = [
  { id: '1', title: 'Learn Dex Framework', completed: true },
  { id: '2', title: 'Build fully typed fullstack apps', completed: false },
]

const createTaskBodySchema = v.object({
  title: v.string({ min: 1 }),
})

export const api = new Elysia()
  .get('/tasks', () => tasks)
  .post('/tasks', ({ body }) => {
    const validated = validateBody(createTaskBodySchema, body)
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: validated.title,
      completed: false,
    }
    tasks.push(newTask)
    return newTask
  })

export type Api = typeof api
