# syntax=docker/dockerfile:1

FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY package.json bun.lock* ./
COPY packages/ ./packages/
RUN bun install --no-progress

COPY . .
RUN bun run build

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 dex \
    && useradd --system --uid 1001 --gid dex --no-create-home dex

COPY --from=builder --chown=dex:dex /app/build /app/build

ENV NODE_ENV=production
ENV PORT=7990

USER dex
EXPOSE 7990

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:7990/api/v1/health || exit 1

CMD ["/app/build/server"]
