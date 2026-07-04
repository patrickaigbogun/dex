# Config-Driven Paths

Dex used to assume a very specific folder layout (`web/pages`, `core/router/.generated`, `web/public/assets`, etc.). 

This made it hard to use Dex in projects that didn't follow that exact structure.

This has been changed so that paths are now **driven by configuration** instead of being hardcoded into the framework.

## The core idea

Your `dex.config.*` file  defines your project's structure. The folder that contains the config file becomes your **project root**. All paths are resolved relative to that root.

You can still use the classic defaults with zero configuration. The new system simply makes it easy to customize.

## Path Precedence

When Dex needs to know a path, it uses this order:

1. What you pass explicitly (CLI flags or options in code)
2. Values from your `dex.config.*` file
3. Built-in defaults (the original layout)

This means you can set sensible defaults in config and still override them when needed.

## Basic usage

### Using the default layout

If you like the original structure, don't specify path keys. Everything continues to work exactly as before.

### Customizing paths with `dex.config`

Create a `dex.config.ts` (or `.js`) in your project:

```ts
export default {
  pagesDir: 'src/pages',
  layoutsDir: 'src/layouts',
  outRoutesTs: 'src/.generated/routes.ts',
  outRoutesJson: 'src/.generated/manifest.json',
  outLayoutsTs: 'src/.generated/layouts.ts',
}
```

Now commands like `bunx dex-router generate` will automatically use these locations.

The folder containing this file is treated as the root for resolving the paths above.

### Overriding paths at the command line

You can always override config values with flags:

```bash
bunx dex-router generate \
  --pagesDir src/views \
  --outRoutesTs .dex/routes.ts
```

Command-line flags take highest priority.

### Using the functions directly

When calling the functions from your own code, you can pass paths explicitly:

```ts
import { generateFsRoutes, generateLayouts } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'app/routes',
  outTs: 'app/.generated/routes.ts',
})

await generateLayouts({
  layoutsDir: 'app/layouts',
  outTs: 'app/.generated/layouts.ts',
})
```

Any paths you pass here win over the config file.

## Development reload watching

The dev reload helper (`dexDevReloadRouter`) follows the same rules.

By default it will watch the build outputs that match the classic layout (resolved from your project root).

You can customize it the same way:

```ts
.use(dexDevReloadRouter({
  watchFiles: ['build/assets/client.js', 'build/assets/styles.css'],
  watchDirs: ['build/assets'],
}))
```

Or let it read the locations from your `dex.config`.

## Common workflows

### Workflow 1: Keep the standard layout

Do nothing. Use the framework exactly as before. No `dex.config` changes required.

### Workflow 2: Move pages into `src/`

1. Create `dex.config.ts` at the root of your project.
2. Point `pagesDir` and `layoutsDir` to your new locations.
3. Run your normal generate / dev / build commands.
4. Everything just works.

### Workflow 3: Monorepo or non-standard structure

Point the config at wherever your pages and generated files actually live:

```ts
export default {
  pagesDir: 'apps/web/pages',
  layoutsDir: 'apps/web/layouts',
  outRoutesTs: 'apps/web/.generated/routes.ts',
}
```

The CLI and library functions will resolve everything relative to the folder that contains this file.

### Workflow 4: One-off overrides

Need to generate routes from a different location just this once?

```bash
bunx dex-router generate --pagesDir tmp/experimental-pages
```

No need to touch your config.

## Benefits of the new approach

- You can structure your project however you like.
- Much easier to adopt Dex into an existing codebase.
- Works naturally in monorepos.
- The framework no longer has opinions about `web/`, `core/`, or `src/`.
- You still get sensible defaults if you don't want to think about it.

## Tips


- CLI flags are great for experimentation or CI.
- Explicit options in code are useful when you're building tooling on top of Dex.
- You don't have to specify every path, only the ones you want to change.

