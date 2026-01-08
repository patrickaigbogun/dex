import { app } from './app'

const port = Number(process.env.PORT ?? 7990)
if (!Number.isFinite(port) || port <= 0)
  throw new Error(`Invalid PORT: ${process.env.PORT}`)

const server = app.listen(port)

console.log(
  `Dex starter running at ${server.server?.hostname}:${server.server?.port}`
)
