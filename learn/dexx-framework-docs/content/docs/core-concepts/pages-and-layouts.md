---
title: "Pages And Layouts"
---

# Pages and Layouts

Pages are your route components. Layouts wrap pages with shared UI. This guide explains how they work together.

## Pages

A page is a React component exported from `web/pages/`:

```tsx
// web/pages/about.tsx
export default function About() {
  return (
    <div>
      <h1>About Us</h1>
      <p>This is the about page.</p>
    </div>
  )
}
```

### Page Metadata

Export `metadata` to customize the page:

```tsx
export const metadata = {
  title: "About Us - My Site",
  description: "Learn more about our company.",
}
```

## Layouts

Layouts wrap pages with shared UI (navigation, sidebars, footers).

### Global Layout

Create `web/layouts/global.tsx` to wrap all pages across your application:

```tsx
// web/layouts/global.tsx
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>© 2026 My Site</footer>
    </div>
  )
}
```

The global layout is passed directly to `<FileRouter GlobalLayout={GlobalLayout} />` in your app bootstrap (`core/bootstrap/web.tsx`).

### Named Layouts

Create reusable named layouts in `web/layouts/`:

```
web/layouts/
├─ global.tsx        # Wraps all pages
├─ dashboard.tsx     # Dashboard layout
└─ auth.tsx          # Auth layout
```

Define the layout component (e.g. `web/layouts/dashboard.tsx`):

```tsx
// web/layouts/dashboard.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout flex">
      <aside className="w-64 border-r">Sidebar</aside>
      <section className="flex-1 p-6">{children}</section>
    </div>
  )
}
```

### Applying a Layout to a Page

To apply a named layout to a page, export `layout` with the layout's file name:

```tsx
// web/pages/dashboard.tsx
export const metadata = { title: "Dashboard" }

// Selects web/layouts/dashboard.tsx
export const layout = "dashboard"

export default function DashboardPage() {
  return <h1>Welcome to Dashboard</h1>
}
```

### Layout Hierarchy

When a page declares a layout, Dex composes them in order:

1. **GlobalLayout** (from `web/layouts/global.tsx`)
2. **Page-declared Layout** (e.g. `web/layouts/dashboard.tsx`)
3. **Page Component** (from `web/pages/dashboard.tsx`)

Rendered output:

```html
<div class="app-shell">
  <div class="dashboard-layout">
    <aside>Sidebar</aside>
    <section>
      <h1>Welcome to Dashboard</h1>
    </section>
  </div>
</div>
```

## Nested Layouts

For nested routes, layouts nest naturally:

```
web/pages/
├─ blog/
│  ├─ index.tsx           # Uses blog.tsx layout
│  └─ posts/
│     ├─ index.tsx         # Uses blog.tsx + posts.tsx layout
│     └─ [slug].tsx        # Uses blog.tsx + posts.tsx layout
```

## Data in Layouts

Layouts can fetch data just like pages:

```tsx
// web/layouts/blog.tsx
import { useServerData } from '@dex/server'

export default function BlogLayout({ children }) {
  const { posts } = useServerData()
  
  return (
    <div>
      <aside>
        {posts.map(p => <a key={p.id}>{p.title}</a>)}
      </aside>
      {children}
    </div>
  )
}
```

## Best Practices

1. **Keep global layout minimal** — only essential elements
2. **Use section layouts** — for repeated section-specific UI
3. **Avoid page-level layouts** — prefer reusable section layouts
4. **Metadata in pages** — not layouts, for better control

## See Also

- [File-Based Routing](./file-based-routing) — How pages map to routes
- [Configuration](./configuration) — Customize layout folder
- [How Dex Works](./how-dex-works) — Build process overview