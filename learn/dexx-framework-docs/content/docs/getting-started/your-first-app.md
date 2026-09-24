---
title: "Your First App"
---

# Your First Dex App

In this tutorial, you'll build a simple blog with Dex. You'll learn how pages, layouts, and routing work together.

## Prerequisites

- [Bun](https://bun.sh) installed (check with `bun --version`)
- Dex CLI installed or accessible via Bun
- A code editor (VS Code recommended)

## Step 1: Create the Project

Scaffold a new Dex application with `dex scaffold`:

```bash
# Scaffold a new Dex project
dex scaffold my-blog

# Enter the project directory
cd my-blog
```

During scaffolding, select your project type (`spa` or `mpa`). The CLI creates the project structure, downloads required framework packages into `packages/`, creates `.dex/metadata.json`, and installs dependencies:

```
my-blog/
├─ .dex/
│  └─ metadata.json       # Template metadata & version tracking
├─ dex.config.ts          # Framework configuration
├─ package.json           # Dependencies and scripts
├─ tsconfig.json          # TypeScript configuration
├─ packages/              # Framework packages (router, server, dev, pie)
├─ web/
│  ├─ pages/              # Your routes go here
│  ├─ layouts/            # Shared layouts
│  └─ public/             # Static assets
└─ routes/                # API route handlers
```

## Step 2: Start the Dev Server

Start the development server with `dex start` (or `bun run dev`):

```bash
dex start
```

You should see:
```
🚀 Dex dev server running at http://localhost:7990
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
  title: "My Blog - Home"
}
```

Save the file. The dev server will hot-reload, and you'll see your changes.

## Step 4: Add a Layout

Create `web/layouts/global.tsx`:

```tsx
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>
        <a href="/">Home</a> | <a href="/about">About</a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
```

Every page will now be wrapped with this layout.

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
  title: "My Blog - About"
}
```

Visit `http://localhost:7990/about` to see it.

## Step 6: Add a Dynamic Route

Create `web/pages/posts/[slug].tsx`:

```tsx
import { useParams } from '@dex/router/client'

export default function Post() {
  const { slug } = useParams()
  
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

Build the application for production using `dex build` (or `bun run build`):

```bash
dex build
```

This compiles your application and builds your client bundle and server output into `build/`.

## Step 8: Run Production Server

Start the production server using `dex start -p` (or `bun run start`):

```bash
dex start -p
```

Your app is now running in production mode (`NODE_ENV=production`) at `http://localhost:7990`.

## What You Learned

- How to scaffold a Dex project with `dex scaffold <dir>`
- How pages map to file-based routes in `web/pages/`
- How layouts wrap pages in `web/layouts/`
- How dynamic routes work with parameters like `[slug]`
- How to build (`dex build`) and run in production (`dex start -p`)

## Next Steps

- [File-Based Routing](../core-concepts/file-based-routing) — Deep dive into routing patterns
- [Pages and Layouts](../core-concepts/pages-and-layouts) — Layout composition and metadata
- [CLI Commands](../cli/commands) — Explore all Dex CLI commands
- [Configuration](../core-concepts/configuration) — Customize folder structure and options