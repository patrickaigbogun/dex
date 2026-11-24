import { Elysia, t } from 'elysia'
import { notesRepo } from '../../db/client'

export const api = new Elysia()
  .get('/notes', () => notesRepo.all())
  .post(
    '/notes',
    ({ body }) => {
      return notesRepo.create(body.content)
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 }),
      }),
    }
  )
  .delete('/notes/:id', ({ params, set }) => {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) {
      set.status = 400
      return { error: 'Invalid note id' }
    }
    notesRepo.delete(id)
    return { success: true }
  })

export type Api = typeof api
