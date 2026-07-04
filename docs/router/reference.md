# Router API Reference

Reference for @dex/router client and server APIs.

## Client API

### Link Component

```tsx
import Link from '@dex/router/client/link'

<Link href="/about">About</Link>
```

### useRouter Hook

```tsx
import { useRouter } from '@dex/router/client'

const router = useRouter()
router.push('/page')
router.back()
```

### useParams Hook

```tsx
import { useParams } from '@dex/router/client'

const { id, slug } = useParams()
```

## Server API

### generateFsRoutes

Generate routes from file system.

```ts
import { generateFsRoutes } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'web/pages',
  outTs: 'core/router/.generated/routes.ts',
  outJson: 'core/router/.generated/manifest.json'
})
```

### generateLayouts

Generate layouts from file system.

```ts
import { generateLayouts } from '@dex/router'

await generateLayouts({
  layoutsDir: 'web/layouts',
  outTs: 'core/router/.generated/layouts.ts'
})
```

## See Also

- [Routing Rules](./routing-rules) — Route patterns
- [Client Navigation](./client-navigation) — Navigation examples