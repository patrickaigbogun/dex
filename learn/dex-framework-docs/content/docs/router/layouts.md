---
title: "Layouts"
---

# Layouts

Layouts wrap pages with persistent, shared UI (headers, sidebars, navigation). Dex supports both application-wide global layouts and page-selected named layouts.

## Global Layout

Create `web/layouts/global.tsx` to wrap every page in your app:

```tsx
// web/layouts/global.tsx
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <nav className="flex gap-4">
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t p-4 text-center text-sm">© 2026 My Site</footer>
    </div>
  )
}
```

The global layout is passed to `<FileRouter GlobalLayout={GlobalLayout} />` in your app bootstrap (`core/bootstrap/web.tsx`).

## Named Layouts

Create specialized layouts in `web/layouts/`:

```
web/layouts/
├─ global.tsx        # App-wide shell
├─ blog.tsx          # Blog layout
└─ admin.tsx         # Admin sidebar layout
```

Example blog layout in `web/layouts/blog.tsx`:

```tsx
// web/layouts/blog.tsx
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Engineering Blog</h1>
      </div>
      <div>{children}</div>
    </div>
  )
}
```

## Selecting a Layout from a Page

Pages opt into a named layout by exporting `layout` matching the layout file name:

```tsx
// web/pages/blog/index.tsx
import { Link } from '@dex/router/client'

export const metadata = { title: "Blog Posts" }

// Resolves web/layouts/blog.tsx
export const layout = 'blog'

export default function BlogIndex() {
  return (
    <div>
      <h2>Latest Articles</h2>
      <Link to="/blog/welcome">Read Welcome Post</Link>
    </div>
  )
}
```

You can also export a function returning the layout name:

```tsx
export const layout = () => 'blog'
```

## Layout Hierarchy

When a page declares a named layout, Dex composes them in order:

1. **GlobalLayout** (outermost container)
2. **Named Layout** (e.g. `BlogLayout`)
3. **Page Component** (innermost view)

Rendered structure:

```html
<GlobalLayout>
  <BlogLayout>
    <BlogIndexPage />
  </BlogLayout>
</GlobalLayout>
```

## Nested Context with `<Outlet />` and `useOutletContext`

Layouts can pass down state and callbacks to nested child pages using `<Outlet context={...} />`:

```tsx
// web/layouts/dashboard.tsx
import { Outlet } from '@dex/router/client'
import { useState } from 'react'

export type DashboardContext = {
  currentProject: string
  setCurrentProject: (name: string) => void
}

export default function DashboardLayout() {
  const [currentProject, setCurrentProject] = useState('Concord')

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4">
        <h2>Projects</h2>
        <p>Active: {currentProject}</p>
      </aside>
      <main className="flex-1 p-8">
        <Outlet<DashboardContext> context={{ currentProject, setCurrentProject }} />
      </main>
    </div>
  )
}
```

Child pages can consume this context via `useOutletContext<T>()`:

```tsx
// web/pages/dashboard/settings.tsx
import { useOutletContext } from '@dex/router/client'
import type { DashboardContext } from '../../layouts/dashboard'

export const layout = 'dashboard'

export default function DashboardSettings() {
  const { currentProject, setCurrentProject } = useOutletContext<DashboardContext>()

  return (
    <div>
      <h3>Settings for {currentProject}</h3>
      <button onClick={() => setCurrentProject('Next Project')}>
        Switch Project
      </button>
    </div>
  )
}
```

## See Also

- [Pages and Layouts Guide](../../core-concepts/pages-and-layouts) — Core mental model
- [Client Navigation](./client-navigation) — Navigation and links
- [Router Reference](./reference) — Full API reference