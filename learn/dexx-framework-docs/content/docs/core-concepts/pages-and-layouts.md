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

Layouts wrap pages with shared UI (header, footer, navigation).

### Global Layout

Create `web/layouts/global.tsx` to wrap all pages:

```tsx
// web/layouts/global.tsx
export default function GlobalLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>© 2024 My Site</footer>
      </body>
    </html>
  )
}
```

### Page-Specific Layouts

Override the global layout for a specific page:

```tsx
// web/pages/dashboard.tsx
export default function Dashboard() {
  return <div>Dashboard content</div>
}

// This layout only wraps the Dashboard page
export function layout({ children }) {
  return (
    <div className="dashboard-layout">
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  )
}
```

### Section Layouts

Create layouts for specific sections:

```
web/layouts/
├─ global.tsx        # All pages
├─ blog.tsx          # Blog pages only
└─ admin.tsx         # Admin pages only
```

Dex looks for `web/layouts/[page-name].tsx` automatically:

```tsx
// web/layouts/blog.tsx
export default function BlogLayout({ children }) {
  return (
    <div>
      <h1>Blog</h1>
      <hr />
      {children}
    </div>
  )
}
```

Now all blog pages use this layout:

```
web/pages/blog/
├─ index.tsx         # Uses BlogLayout
└─ [slug].tsx        # Uses BlogLayout
```

## Layout Composition Order

Layouts apply in this order (outer to inner):

1. `web/layouts/global.tsx`
2. `web/layouts/[page]/layout.tsx` or `web/layouts/[page].tsx`
3. Page-level `layout` export

Example:

```tsx
// web/layouts/global.tsx
export default function Global({ children }) {
  return <div className="global">{children}</div>
}

// web/layouts/blog.tsx
export default function Blog({ children }) {
  return <div className="blog">{children}</div>
}

// web/pages/blog/posts.tsx
export default function Posts() {
  return <h1>Posts</h1>
}

export function layout({ children }) {
  return <div className="posts">{children}</div>
}
```

Rendered output:

```html
<div class="global">
  <div class="blog">
    <div class="posts">
      <h1>Posts</h1>
    </div>
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