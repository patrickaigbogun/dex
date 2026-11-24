---
title: "Dev"
---

# `@dex/dev` (Agent)

## Core Bootstraps & Exports

- `core/bootstrap/dev.ts`
- `core/bootstrap/build.ts`
- `spawnGroup([{ name, cmd }])`
- `dexDev`, `dexBuild`, `dexBuildClient`, `dexPrepareBuild`, `dexPrerender`

## Behavior

- Spawns tasks via `Bun.spawn()`.
- Prefixes stdout/stderr with `[name]`.

## See Also

- Dev Guide: [`../dev/`](../dev/)
- Server Guide: [`../server/`](../server/)
