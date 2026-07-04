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

```ts
// dex.config.ts
export default {
  ssg: {
    // Routes to pre-render
    routes: [
      '/',
      '/about',
      '/blog',
      '/blog/post-1',
      '/blog/post-2'
    ]
  }
}
```

## Programmatic

```ts
import { generateStaticSite } from '@dex/router'

await generateStaticSite({
  routes: ['/', '/about'],
  outDir: 'build'
})
```

## Performance Benefits

- **Faster responses** — Static files are faster than dynamic rendering
- **Better SEO** — Pre-rendered HTML is indexable
- **Reduced server load** — No rendering at runtime

## See Also

- [Recipes Index](./index) — Other recipes
- [Production Build](../deployment/production-build) — Build process