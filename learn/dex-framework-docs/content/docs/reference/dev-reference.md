---
title: "Dev Reference"
---

# Dev API Reference

Reference for `@dex/dev` exports and tasks.

## Exports from `@dex/dev`

```ts
import { 
  spawnGroup, 
  dexDev, 
  dexBuild, 
  dexBuildClient, 
  dexPrepareBuild, 
  dexPrerender, 
  type DexTaskOptions 
} from '@dex/dev'
```

### `spawnGroup(tasks)`
Spawns a group of subprocesses with prefixing and coordinated shutdown.

### `dexDev(opts: DexTaskOptions)`
Runs development watchers and dev server supervisor.

### `dexBuild(opts: DexTaskOptions)`
Executes the full production build pipeline (prepare, client bundle, server compile, SSG prerender).

### `dexBuildClient(opts: DexTaskOptions)`
Bundles client scripts with environment defines (`getPublicEnvDefines`).

### `dexPrepareBuild(opts: DexTaskOptions)`
Prepares build directories and intermediate files.

### `dexPrerender(opts: DexTaskOptions)`
Prerenders static (`ssg`) pages.

### `DexTaskOptions`
Type definition: `{ rootDir: string; defineArgs?: string[] }`.

---

## See Also

- [Development Guide](../dev/) — Dev tools overview
- [Watch Process](../dev/watch-process) — File watching