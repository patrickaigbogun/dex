# Deployment Platforms

Deploy your Dex build to popular platforms.

## Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

## Render

1. Push code to GitHub
2. Create new Web Service
3. Set build command: `bun run build`
4. Set start command: `cd build && ./server`
5. Set `PORT` to 7990 in environment

## Vercel

Dex produces a standard Node binary, compatible with Vercel:

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "build",
  "publicDirectory": "build",
  "installCommand": "bun install"
}
```

## Docker

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install

COPY . .

RUN bun run build

EXPOSE 7990

CMD ["./build/server"]
```

## Fly.io

```bash
fly launch

# In fly.toml:
# [env]
# PORT = "7990"

fly deploy
```

## See Also

- [Production Build](./production-build) — Build process
- [API-Only Deploy](../recipes/api-only-deploy) — Backend-only deployment