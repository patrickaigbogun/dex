# File Conventions

Naming and structure rules for Dex files.

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

// Optional metadata
export const metadata = {
  title: "Page Title",
  description: "Page description"
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