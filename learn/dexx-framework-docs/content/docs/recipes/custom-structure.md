---
title: "Custom Structure"
---

# Custom Project Structure

Use `dex.config.ts` to customize your folder structure.

## Default Structure

```
web/
├─ pages/
├─ layouts/
└─ public/
```

## Custom Structure

Create `dex.config.ts`:

```ts
import { defineConfig } from 'dex/config'

export default defineConfig({
  pagesDir: 'src/routes',
  layoutsDir: 'src/layouts',
  publicDir: 'static',
  outDir: 'src/.generated',
})
```

Now your structure becomes:

```
src/
├─ routes/           # Pages
├─ layouts/         # Layouts
└─ static/          # Assets
```

## CLI Override

Override config on the command line:

```bash
bun run dev --pagesDir src/views
```

## Programmatic Usage

```ts
import { generateFsRoutes } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'app/routes',
  outTs: 'app/.generated/routes.ts',
})
```

## See Also

- [Configuration](../core-concepts/configuration) — Config options
- [Recipes Index](./index) — Other recipes