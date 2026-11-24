---
title: "Your First App"
---

# Your First Dex App

In this tutorial, you'll build a simple blog with Dex. You'll learn how pages, layouts, dynamic routes, API routes, and production builds work together.

## Prerequisites

- [Bun](https://bun.sh) installed (check with `bun --version`)
- The **Native Go CLI (`dex`)** installed (check with `dex --version`)
- A code editor (VS Code recommended)

## Step 1: Create the Project

Scaffold a new Dex application with `dex scaffold`:

```bash
# Scaffold a new Dex project
dex scaffold my-blog

# Enter the project directory
cd my-blog
```

The CLI downloads the template and framework packages (`router`, `server`, `dev`, `pie`) into `packages/`, creates `.dex/metadata.json`, and installs dependencies with `bun install`:

```text
my-blog/
├─ .dex/
│  └─ metadata.json               # Template metadata & version tracking
├─ dex.config.ts                  # Framework configuration
├─ package.json                   # Dependencies and scripts
├─ tsconfig.json                  # TypeScript configuration
├─ packages/                      # Framework packages (router, server, dev, pie)
├─ core/
│  ├─ api/generated.ts            # Generated @dex/pie OpenAPI types & client factory
│  ├─ bootstrap/                  # dev.ts, build.ts, scripts.ts, web.tsx
│  ├─ router/.generated/          # Auto-generated routes.ts, layouts.ts, manifest.json
│  └─ runtime/
│     ├─ app/index.ts             # Dev Elysia server
│     └─ server/prod.ts           # Production server source
├─ lib/
│  └─ api.ts                      # Configured @dex/pie client
├─ routes/
│  └─ api/                        # Elysia API route handlers
└─ web/
   ├─ pages/                      # Your React route pages
   ├─ layouts/                    # Shared & named layouts
   ├─ public/                     # Static index.html and dev assets
   └─ styles/                     # Tailwind CSS v4 entrypoint (index.css)
```

## Step 2: Start the Dev Server

Start the development server with `dex start` (which executes `core/bootstrap/dev.ts`):

```bash
dex start
```

You should see output from the parallel dev tasks (`routes:watch`, `styles:watch`, `client:watch`, `server:dev`) and:

```text
Dex starter running at localhost:7990
```

Open your browser to `http://localhost:7990` to see the welcome page.

## Step 3: Edit the Homepage

Open `web/pages/index.tsx` in your editor:

```tsx
export default function Home() {
  return (
    <div>
      <h1>Welcome to My Blog</h1>
      <p>A simple blog built with Dex.</p>
    </div>
  )
}

export const metadata = {
  title: 'My Blog - Home',
  description: 'A simple blog built with Dex.',
}
```

Save the file. The client watcher rebuilds `web/public/assets/client.js`, and SSE live reload refreshes your browser.

## Step 4: Add a Layout

Edit or create `web/layouts/global.tsx` and use `<Link>` from `@dex/router/client` for client-side navigation with intent prefetching:

```tsx
import { Link } from '@dex/router/client'

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/about">About</Link>
      </nav>
      <main>{children}</main>
    </div>
  )
}
```

`core/bootstrap/web.tsx` passes `GlobalLayout` directly to `<FileRouter />`, so every page is wrapped with this layout.

## Step 5: Add an About Page

Create `web/pages/about.tsx`:

```tsx
export default function About() {
  return (
    <div>
      <h1>About This Blog</h1>
      <p>This is a Dex-powered blog.</p>
    </div>
  )
}

export const metadata = {
  title: 'My Blog - About',
}
```

Visit `http://localhost:7990/about` to see it.

## Step 6: Add a Dynamic Route

Create `web/pages/posts/[slug].tsx`:

```tsx
import { useParams } from '@dex/router/client'

export default function Post() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div>
      <h1>Post: {slug}</h1>
      <p>This is post number {slug}.</p>
    </div>
  )
}
```

Visit `http://localhost:7990/posts/1` or `http://localhost:7990/posts/my-first-post`.

## Step 7: Build for Production

Build the application for production using `dex build` (which runs `core/bootstrap/build.ts`):

```bash
dex build
```

This generates routes and layouts, runs SSG prerendering for static `ssg` routes, compiles Tailwind CSS, bundles the ESM code-split client with `?v=<hash>` cache busting, and compiles `core/runtime/server/prod.ts` into a **Standalone Bun server executable (`build/server`)**.

## Step 8: Run Production Server

Start the production server using `dex start -p`:

```bash
dex start -p
```

Your app is now running in production mode (`NODE_ENV=production`) via `./build/server` at `http://localhost:7990`.

## What You Learned

- How to scaffold a Dex project with `dex scaffold <dir>`
- How pages map to file-based routes in `web/pages/`
- How layouts wrap pages in `web/layouts/`
- How dynamic routes work with parameters like `[slug]`
- How to build (`dex build`) and run the standalone Bun server executable (`dex start -p`)

## Next Steps

- [File-Based Routing](../core-concepts/file-based-routing) — Deep dive into routing patterns
- [Pages and Layouts](../core-concepts/pages-and-layouts) — Layout composition and metadata
- [CLI Commands](../cli/commands) — Explore all Dex CLI commands
- [Configuration](../core-concepts/configuration) — Customize folders, subdomains, fonts, and OpenAPI codegen
