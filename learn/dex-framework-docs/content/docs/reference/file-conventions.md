---
title: "File Conventions"
---

# File Conventions

Naming and structure rules for Dex files.

## Project Structure & Core Files

- `core/bootstrap/dev.ts` — Development bootstrap script
- `core/bootstrap/build.ts` — Production build bootstrap script
- `core/bootstrap/scripts.ts` — CLI script helpers
- `core/bootstrap/web.ts` — Web entry point bootstrap
- `core/runtime/app/index.ts` — Client application runtime entry
- `core/runtime/server/prod.ts` — Production server runtime
- `core/api/generated.ts` — Generated typed API client (`dex pie generate`)
- `lib/api.ts` — API client initialization wrapper
- `routes/api/` — Backend API routes / handlers
- `web/pages/` — Frontend page components
- `web/layouts/` — Layout components
- `web/styles/index.css` — Global styles and Tailwind imports

## Pages

| File | Route |
|------|-------|
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `[id].tsx` | `/:id` |
| `[...slug].tsx` | `/*` |

## Layouts

| File | Purpose |
|------|---------|
| `global.tsx` | Wraps all pages |
| `blog.tsx` | Wraps `/blog/*` |
| `layout.tsx` | Page-specific (in pages folder) |

## Ignored Files

Files/folders starting with `_` are ignored:

- `_private.tsx`
- `_utils/`
- `pages/_internal/`

## Export Rules

### Page Exports

```tsx
// Default export is required
export default function Page() { }

// Optional metadata (supports SSG renderStrategy and head meta)
export const metadata = {
  renderStrategy: 'ssg',
  title: "Page Title",
  description: "Page description",
  ogImage: "https://example.com/image.png"
}

// Optional layout
export function layout({ children }) {
  return <div>{children}</div>
}
```

### Layout Exports

```tsx
// Default export is required
export default function Layout({ children }) {
  return <div>{children}</div>
}
```