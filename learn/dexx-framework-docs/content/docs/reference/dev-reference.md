---
title: "Dev Reference"
---

# Dev API Reference

Reference for dev utilities.

## @dex/dev

The dev process supervisor.

### dexDev

Start the dev process with multiple watchers.

```ts
import { dexDev } from '@dex/dev'

await dexDev({
  tasks: [
    { name: 'router', command: 'dex-router' },
    { name: 'styles', command: 'tailwindcss' },
    { name: 'client', command: 'esbuild' }
  ]
})
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 7990 | Dev server port |
| `NODE_ENV` | development | Environment |

## Logs

Dev process prefixes each watcher's output:

```
[router] 🔄 Routes generated
[styles] 🎨 Styles compiled
[client] 📦 Client bundled
```

## See Also

- [Development Guide](../dev/) — Dev tools overview
- [Watch Process](../dev/watch-process) — File watching