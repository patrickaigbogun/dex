# Dev Supervisor Internals (`@dex/dev`)

`@dex/dev` provides a compact process supervisor for local development workflows.

## Core API

```ts
spawnGroup([{ name: 'task', cmd: ['bun', 'run', 'dev'] }])
```

## Internal behavior

`spawnGroup`:

1. spawns all tasks,
2. streams output,
3. prefixes lines with task tags,
4. kills all tasks if any exits non-zero,
5. handles SIGINT/SIGTERM for graceful shutdown.

## Output strategy

Two modes:

- default: prefixed line-by-line output for readability,
- raw mode: inherit stdio directly (`DEX_DEV_RAW=1`).

Color behavior depends on TTY and `NO_COLOR`.

## Why this matters

In multi-watch setups, untagged logs quickly become unreadable.
Prefixed output keeps source attribution clear.

## Failure semantics

Design is intentionally strict:

- one task crashes -> whole group shuts down.

This avoids “half-running” dev sessions that hide broken watches.

## Integration example (starter)

In starter dev script:

- routes watcher
- tailwind watcher
- client bundler watcher
- server watcher

all run as one supervised group.

## Extension guidance

If you add features here, preserve simplicity:

- do not add heavy orchestration semantics,
- avoid hidden retries by default,
- keep kill behavior deterministic.
