---
title: "Layouts"
---

# Layouts

Layouts wrap pages with shared UI. Dex supports global, section, and page-specific layouts.

## Global Layout

Create `web/layouts/global.tsx` to wrap all pages:

```tsx
export default function GlobalLayout({ children }) {
  return (
    <html>
      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>© 2024</footer>
      </body>
    </html>
  )
}
```

## Section Layouts

Create `web/layouts/blog.tsx` to wrap blog pages:

```tsx
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

Pages in `web/pages/blog/` automatically use this layout:

```
web/pages/blog/
├─ index.tsx         # Uses BlogLayout
└─ [slug].tsx        # Uses BlogLayout
```

## Page-Specific Layouts

Override layouts for individual pages:

```tsx
// web/pages/dashboard.tsx
export default function Dashboard() {
  return <div>Dashboard</div>
}

export function layout({ children }) {
  return (
    <div className="dashboard">
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  )
}
```

## Layout Composition Order

Layouts apply outer to inner:

1. `web/layouts/global.tsx`
2. `web/layouts/[page].tsx` or `web/layouts/[page]/layout.tsx`
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

Result:

```html
<div class="global">
  <div class="blog">
    <div class="posts">
      <h1>Posts</h1>
    </div>
  </div>
</div>
```

## See Also

- [File-Based Routing](./routing-rules) — How pages map to routes
- [Configuration](./configuration) — Customize layout folder
- [How Dex Works](../getting-started/how-dex-works) — Build process