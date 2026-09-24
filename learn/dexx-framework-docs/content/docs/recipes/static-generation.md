---
title: "Static Generation"
---

# Static Site Generation

Pre-render pages at build time for better performance.

## What Is SSG?

SSG (Static Site Generation) renders pages to static HTML during the build process. The generated HTML is served directly without any server-side rendering.

## When to Use SSG

- Blog sites with known routes
- Marketing pages
- Docs sites
- Content-heavy sites that change infrequently

## How It Works

1. During build, Dex generates static HTML for specified routes
2. Server serves pre-rendered HTML
3. Client router takes over for navigation

## Configuration

Set the default rendering strategy in `dex.config.ts`:

```ts
// dex.config.ts
export default {
  renderStrategy: 'ssg',
}
```

Or configure rendering strategy per-page:

```tsx
// web/pages/blog/[slug].tsx
export const metadata = {
  renderStrategy: 'ssg',
}

export default function BlogPost() {
  return <article>Content</article>
}
```

## Prerendering

During build, `dexPrerender` generates static HTML files for static routes when `renderStrategy` is set to `'ssg'`.

## Performance Benefits

- **Faster responses** — Static files are faster than dynamic rendering
- **Better SEO** — Pre-rendered HTML is indexable
- **Reduced server load** — No rendering at runtime

## See Also

- [Recipes Index](./index) — Other recipes
- [Production Build](../deployment/production-build) — Build process