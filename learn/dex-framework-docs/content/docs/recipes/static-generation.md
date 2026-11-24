---
title: "Static Generation"
---

# Static Site Generation

Pre-render pages at build time for better performance.

## What Is SSG?

SSG (Static Site Generation) renders pages to static HTML during the build process (`dex build` / `dexPrerender`). The generated HTML is served directly without server-side runtime rendering.

## Configuration & Usage

Set rendering strategy globally in `dex.config.ts`:

```ts
// dex.config.ts
export default {
  renderStrategy: 'ssg',
}
```

Or configure per-page via page metadata export:

```tsx
// web/pages/blog/[slug].tsx
export const metadata = {
  renderStrategy: 'ssg',
  title: 'Blog Post',
  description: 'A pre-rendered blog post',
  ogImage: 'https://example.com/og.png',
}

export default function BlogPost() {
  return <article>Pre-rendered content</article>
}
```

## How Prerendering Works

1. During `dex build`, `dexPrerender` evaluates routes where `renderStrategy === 'ssg'`.
2. Each page is rendered wrapped in `<RouterContext.Provider>` with static route state.
3. `<head>` metadata (`metadata`) and Google Fonts (`fonts`) are injected.
4. Output HTML files are written to `build/__ssg/` and copied to `build/<route>/index.html`.
5. `dexSpaFallback` automatically detects and serves pre-rendered SSG HTML files at runtime.

## See Also

- [Recipes Index](./index) — Other recipes
- [Production Build](../deployment/production-build) — Build process