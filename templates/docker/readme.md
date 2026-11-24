# Dex Docker Template

Production-ready multi-stage Docker configuration for Dex applications.

## Files

- `Dockerfile` — Multi-stage build using `oven/bun:1-slim` to build `/app/build` and a minimal `debian:bookworm-slim` runtime running as a non-root `dex` user with a `/api/health` healthcheck.
- `docker-compose.yml` — Defines the production `app` service and an opt-in `dev` service (`--profile dev`).
- `.dockerignore` — Excludes `node_modules`, `build`, `.vercel`, `.git`, and local `.env` files from the Docker build context.
- `.env.example` — Sample environment variables for container deployments.

## Quick Start

Copy the template files into your Dex project root (or run `dex deploy docker`):

```bash
cp .env.example .env
```

### Build and Run with Docker

```bash
docker build -t dex-app .
docker run -d -p 7990:7990 --env-file .env --name dex-app dex-app
```

### Production with Docker Compose

```bash
docker compose up --build -d
```

### Development with Docker Compose

```bash
docker compose --profile dev up
```
