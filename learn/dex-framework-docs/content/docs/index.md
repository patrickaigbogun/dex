---
title: "Dex Documentation"
---

# Dex Documentation

Welcome to the Dex documentation. Dex is a composable, Bun-first full-stack framework powered by a **Native Go CLI (`dex`)** (<8 MB binary, <5ms startup), file-based React routing, Elysia server primitives, and a typed OpenAPI route-tree client.

## Getting Started

- [Getting Started](./getting-started/) — Install the native Go CLI and start quickly
- [What is Dex?](./getting-started/what-is-dex) — Understand the framework and architecture
- [Your First App](./getting-started/your-first-app) — Build your first app step by step
- [How Dex Works](./getting-started/how-dex-works) — Mental model for routing, layouts, SSG, and builds

## Core Concepts

- [File-Based Routing](./core-concepts/file-based-routing) — Pages map to routes
- [Pages and Layouts](./core-concepts/pages-and-layouts) — Layout composition and head metadata
- [Configuration](./core-concepts/configuration) — Customize paths, subdomains, fonts, and API codegen
- [Build Process](./core-concepts/build-process) — ESM code splitting, SSG prerendering, and standalone Bun server executable
- [Dev vs Production](./core-concepts/dev-vs-prod) — Development and production runtime differences

## Guides

- [Router](./router/) — File-based routing, concurrent transitions, prefetching, and subdomain mounting
- [Server](./server/) — Serving assets, SSG-aware SPA fallback, Google Fonts, and dev reload
- [Pie (API Client)](./pie/) — Typed route-tree HTTP client and JSON/YAML OpenAPI code generator
- [Development](./dev/) — Parallel dev watcher and build helpers

## Recipes

- [Custom Structure](./recipes/custom-structure) — Custom folder layout
- [Monorepo Setup](./recipes/monorepo) — Use Dex in a monorepo
- [API-Only Deploy](./recipes/api-only-deploy) — Backend-only mode with `DEX_API_ONLY=1`
- [Static Generation](./recipes/static-generation) — SSG prerendering and metadata injection
- [Environment Config](./recipes/environment-config) — Client-safe public environment variables

## Reference

- [CLI Flags](./reference/cli-flags) — Command-line options
- [Config Schema](./reference/config-schema) — Configuration reference
- [Server Exports](./reference/server-exports) — `@dex/server` API surface
- [Dev API Reference](./reference/dev-reference) — `@dex/dev` helpers
- [File Conventions](./reference/file-conventions) — Naming rules

## Full Documentation

- [CLI](./cli/) — Scaffolding, syncing, template diffing, and multi-version management
- [Deployment](./deployment/) — Production builds and deployment targets
- [Troubleshooting](./troubleshooting/) — Common issues and fixes
