---
title: "Layouts"
---

# Layouts

Layouts wrap pages with persistent, shared UI (headers, sidebars, navigation). Dex supports both application-wide global layouts and page-selected named layouts.

## Global Layout

Create `web/layouts/global.tsx` to wrap every page in your app:

```tsx
// web/layouts/global.tsx
import { Link } from '@dex/router/client'

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <nav className="flex gap-4">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t p-4 text-center text-sm">© 2026 My Site</footer>
    </div>
  )
}
```

The global layout is passed to `<FileRouter GlobalLayout={GlobalLayout} />` in `core/bootstrap/web.tsx`.

## Named Layouts

Create specialized layouts in `web/layouts/`:

```
web/layouts/
├─ global.tsx        # App-wide shell
├─ blog.tsx          # Blog layout ('blog')
├─ dashboard/
│  └─ index.tsx      # Nested index layout ('dashboard')
└─ _shared.tsx       # Ignored (_ prefix)
```

`generateLayouts` scans `web/layouts/` for `.tsx` and `.ts` files (ignoring `.d.ts`, `_`-prefixed files/directories, and symbolic links) and generates `core/router/.generated/layouts.ts`.

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

Pages opt into a named layout by exporting `layout` matching the layout name:

```tsx
// web/pages/blog/index.tsx
import { Link, type Metadata } from '@dex/router/client'

export const metadata: Metadata = {
  title: 'Blog Posts',
  description: 'Engineering updates and release notes.',
  renderStrategy: 'ssg',
}

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

You can also export a function returning the layout name dynamically:

```tsx
export const layout = () => 'blog'
```

## Layout Hierarchy & Error Boundary

When a page declares a named layout, Dex composes them in order:

1. **`GlobalLayout`** (outermost container)
2. **`RouterErrorBoundary`** (wraps `GlobalLayout` and resets automatically on pathname changes)
3. **Named `Layout`** (e.g. `BlogLayout`)
4. **Page Component** (innermost view)

Rendered structure:

```tsx
<RouterErrorBoundary resetKey={pathname}>
  <GlobalLayout>
    <BlogLayout>
      <BlogIndexPage />
    </BlogLayout>
  </GlobalLayout>
</RouterErrorBoundary>
```

## Page `Metadata`

Page modules can export `metadata: Metadata` to configure document head tags, Open Graph/Twitter cards, and per-page rendering strategy:

```tsx
import type { Metadata } from '@dex/router'

export const metadata: Metadata = {
  title: 'Introducing Dex v0.3.0',
  description: 'File-based routing, SSG prerendering, and typed APIs.',
  ogTitle: 'Dex v0.3.0 Release',
  ogDescription: 'Read what is new in Dex v0.3.0.',
  ogImage: 'https://example.com/images/dex-v026.png',
  ogVideo: 'https://example.com/videos/demo.mp4',
  ogType: 'article',
  url: 'https://example.com/blog/dex-v026',
  twitterCard: 'summary_large_image',
  renderStrategy: 'ssg',
}
```

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Sets `document.title` on client navigation and `<title>` during SSG/server `<head>` injection. |
| `description` | `string` | Sets `<meta name="description">`, `og:description`, and `twitter:description`. |
| `ogTitle` | `string` | Open Graph `og:title` and `twitter:title` (falls back to `title`). |
| `ogDescription` | `string` | Open Graph `og:description` and `twitter:description` (falls back to `description`). |
| `ogImage` | `string` | Sets `og:image` and `twitter:image` (unsafe schemes are filtered). |
| `ogVideo` | `string` | Sets `og:video`, `og:video:secure_url`, and `og:video:type` (`video/mp4`). |
| `ogType` | `string` | Sets `og:type` (e.g. `'website'`, `'article'`). |
| `url` | `string` | Sets `og:url` canonical URL. |
| `twitterCard` | `'summary' \| 'summary_large_image' \| 'player'` | Sets `twitter:card` (defaults to `'summary_large_image'` when `ogImage` is set, `'summary'` otherwise). |
| `renderStrategy` | `'spa' \| 'ssg'` | Overrides the app-wide `renderStrategy` in `dex.config.ts` for this page (`'ssr'`, `'ppr'`, `'dynamic'` reserved). |

During client-side navigation, `<FileRouter />` applies `title` and `<meta name="description">` immediately. During `dexPrerender` (build-time SSG) and `dexSpaFallback` (`resolveHead`), all Open Graph and Twitter tags are injected into `<head>` before `</head>`.

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

Child pages consume this context via `useOutletContext<T>()`:

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
- [Client Navigation](./client-navigation) — Navigation, error boundaries, and SSG context
- [Router Reference](./reference) — Full API reference
