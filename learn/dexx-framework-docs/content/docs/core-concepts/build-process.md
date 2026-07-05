---
title: "Build Process"
---

# The Build Process

Dex's build process transforms your source files into a deployable application. This guide covers what happens and when.

## Development Mode

Run with `bun run dev`:

```bash
bun run dev
```

**What happens:**
1. Watches `web/pages/` and `web/layouts/` for changes
2. Generates routes on file changes
3. Starts dev server with hot reload
4. Serves from `core/router/.generated/`

**Output:**
- Routes generated in `core/router/.generated/routes.ts`
- Server runs at `http://localhost:7990`
- Hot reload on page edits

## Production Build

Run with `bun run build`:

```bash
bun run build
```

**What happens:**
1. **Generate routes** — scans pages, creates `routes.ts`
2. **Bundle client** — compiles React to static JS
3. **Build server** — creates deployable Node binary
4. **Copy assets** — moves `public/` to `build/`

**Output structure:**
```
build/
├─ server           # Node.js binary
├─ index.html       # Entry HTML
├─ assets/
│  ├─ client.js     # Client router bundle
│  └─ styles.css    # CSS (if any)
└─ core/
   └─ router/
      └─ .generated/
         ├─ routes.ts
         └─ layouts.ts
```

## Build Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev server with hot reload |
| `bun run build` | Create production build |
| `bun run start` | Run production server |
| `bun run generate` | Regenerate routes only |

## Generated Files

### routes.ts

Maps routes to components:

```ts
export const routes = [
  { path: '/', component: () => import('../pages/index.tsx') },
  { path: '/about', component: () => import('../pages/about.tsx') },
]
```

### layouts.ts

Maps layouts to pages:

```ts
export const layouts = {
  '/': () => import('../layouts/global.tsx'),
  '/blog': () => import('../layouts/blog.tsx'),
}
```

**Never edit these files** — they're auto-generated.

## Customization

Override output locations in `dex.config.ts`:

```ts
export default {
  outDir: 'src/.generated',  // Generated files
  distDir: 'build',          // Production output
}
```

## See Also

- [How Dex Works](./how-dex-works) — Mental model
- [Configuration](./configuration) — Customize paths
- [Production Server](./server/production) — Running in prod