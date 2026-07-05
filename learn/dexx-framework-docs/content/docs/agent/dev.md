---
title: "Dev"
---

# `@dex/dev` (Agent)

## Export

- `spawnGroup([{ name, cmd }])`

## Behavior

- Spawns each command via `Bun.spawn()`.
- If any process exits non-zero, terminates the whole group.
- Handles `SIGINT`/`SIGTERM` by shutting down the group.
- Prefixes each task’s stdout/stderr lines with `[name]` (colorized when TTY).
- Set `DEX_DEV_RAW=1` to disable prefixing and inherit raw stdio.

## Starter usage

- `templates/starter/scripts/dev.ts`
