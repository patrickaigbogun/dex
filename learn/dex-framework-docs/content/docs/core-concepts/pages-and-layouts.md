---
title: "Pages And Layouts"
---

# Pages and Layouts

Pages are your route components under `web/pages/`. Layouts wrap pages with shared UI from `web/layouts/`. This guide explains how they compose and how metadata works.

## Pages

A page is a React component exported as `default` from `web/pages/`:

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

### Page Metadata & Rendering Strategy

Export `metadata` from a page to set `<head>` metadata (applied dynamically on client navigation and injected into static HTML during SSG prerendering) and optionally override the page's rendering strategy:

```tsx
import type { Metadata } from '@dex/router'

export const metadata: Metadata = {
  title: 'About Us - My Site',
  description: 'Learn more about our company.',
  ogTitle: 'About Us',
  ogDescription: 'Learn more about our company.',
  ogImage: 'https://example.com/og-about.png',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  renderStrategy: 'ssg',
}
```

Supported `Metadata` fields:

- `title`, `description`
- `ogTitle`, `ogDescription`, `ogImage`, `ogVideo`, `ogType`, `url`
- `twitterCard` (`'summary' | 'summary_large_image' | 'player'`)
- `renderStrategy` (`'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'`)

## Layouts

Layouts wrap pages with shared UI (navigation, sidebars, footers).

### Global Layout

Create `web/layouts/global.tsx` to wrap all pages across your application:

```tsx
// web/layouts/global.tsx
import { Link } from '@dex/router/client'

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>© 2026 My Site</footer>
    </div>
  )
}
```

The global layout is passed directly to `<FileRouter GlobalLayout={GlobalLayout} />` in `core/bootstrap/web.tsx`.

### Named Layouts

Create reusable named layouts in `web/layouts/`:

```text
web/layouts/
├─ global.tsx        # Passed to <FileRouter GlobalLayout={GlobalLayout} />
├─ dashboard.tsx     # Named layout: 'dashboard'
└─ auth.tsx          # Named layout: 'auth'
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

The router generator discovers `.ts` and `.tsx` modules in `web/layouts/` (including `folder/index.tsx` mapped to `folder`) and writes lazy loaders to `core/router/.generated/layouts.ts`.

### Applying a Layout to a Page

To apply a named layout to a page, export `layout` as a string (or a function returning a layout name):

```tsx
// web/pages/dashboard.tsx
export const metadata = { title: 'Dashboard' }

// Selects web/layouts/dashboard.tsx
export const layout = 'dashboard'

export default function DashboardPage() {
  return <h1>Welcome to Dashboard</h1>
}
```

### Layout Hierarchy

When a page declares a layout, Dex composes them inside `<RouterErrorBoundary>` in order:

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

## Passing Context with `<Outlet>`

Use `<Outlet context={...} />` and `useOutletContext()` from `@dex/router/client` when sharing state from a layout or parent wrapper down to nested content.

## Client-Only Components & Error Boundaries

- **`<ClientOnly fallback={...}>` / `clientOnly(Component)`**: Safely render browser-only UI on SSG-prerendered pages without hydration mismatches.
- **`RouterErrorBoundary`**: Automatically wraps rendered views and layouts and resets on route changes; pass a custom `errorBoundary` component to `<FileRouter />` to customize error UI.

## Best Practices

1. **Keep `GlobalLayout` minimal** — reserve it for app-wide shells and navigation
2. **Use named layouts** — group section-specific UI under `web/layouts/`
3. **Use `<Link>` for internal navigation** — enables intent prefetching and zero-flicker transitions
4. **Define `metadata` on pages** — ensures accurate `<head>` tags during SSG and client transitions

## See Also

- [File-Based Routing](./file-based-routing) — How pages map to routes
- [Configuration](./configuration) — Customize layout folder and rendering strategy
- [How Dex Works](../getting-started/how-dex-works) — Build and prerender overview
