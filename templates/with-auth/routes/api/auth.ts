import { Elysia, t } from 'elysia'
import crypto from 'node:crypto'

const SECRET = process.env.AUTH_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production')
  }
  console.warn('⚠️ AUTH_SECRET not set, using insecure development fallback')
  return 'dev-secret-key'
})()

async function signToken(username: string, ttlMs = 24 * 60 * 60 * 1000): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Date.now() + ttlMs })).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payload, sig] = parts
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof decoded.sub !== 'string' || typeof decoded.exp !== 'number' || Date.now() >= decoded.exp) {
      return null
    }
    return decoded.sub
  } catch {
    return null
  }
}

export const api = new Elysia()
  .post('/auth/login', async ({ body, set }) => {
    const { username, password } = body as { username: string; password: string }
    if (username === 'admin' && password === 'password') {
      const token = await signToken(username)
      return { token, user: { username } }
    }
    set.status = 401
    return { error: 'Invalid credentials' }
  }, {
    body: t.Object({
      username: t.String({ minLength: 1 }),
      password: t.String({ minLength: 1 }),
    }),
  })
  .get('/auth/me', async ({ headers, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const token = authHeader.slice(7)
    const username = await verifyToken(token)
    if (!username) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return { authenticated: true, user: { username } }
  })

export type Api = typeof api
