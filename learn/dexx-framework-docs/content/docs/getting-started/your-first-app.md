---
title: "Your First App"
---

# Your First Dex App

In this tutorial, you'll build a simple blog with Dex. You'll learn how pages, layouts, and routing work together.

## Prerequisites

- Bun installed (check with `bun --version`)
- A code editor (VS Code recommended)

## Step 1: Create the Project

```bash
# Scaffold a new Dex project
bunx dex create my-blog

# Enter the project directory
cd my-blog
```

This creates:
```
my-blog/
├─ dex.config.ts      # Optional configuration
├─ package.json
├─ web/
│  ├─ pages/          # Your routes go here
│  ├─ layouts/        # Shared layouts
│  └─ public/         # Static assets
└─ core/              # Generated files
```

## Step 2: Start the Dev Server

```bash
bun run dev
```

You should see:
```
🚀 Dex dev server running at http://localhost:7990
```

Open your browser to see the welcome page.

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
export default function GlobalLayout({ children }) {
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

Visit `http://localhost:7990/posts/1` or `/posts/my-first-post`.

## Step 7: Build for Production

```bash
bun run build
```

This creates a `build/` folder with:
- A Node.js server binary
- Static assets
- Generated routes

## Step 8: Run Production Server

```bash
cd build
PORT=7990 ./server
```

Your app is now running in production mode at `http://localhost:7990`.

## What You Learned

- How to scaffold a Dex project
- How pages map to routes
- How layouts wrap pages
- How dynamic routes work with `[slug]`
- How to build and run in production

## Next Steps

- [File-Based Routing](./file-based-routing) — Deep dive into routing patterns
- [Pages and Layouts](./pages-and-layouts) — Layout composition and metadata
- [Configuration](./configuration) — Customize folder structure