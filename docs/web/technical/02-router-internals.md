# Router Internals

This section explains the internals of `@dex/router` from generation through runtime matching.

## Public exports

From `framework/packages/router/src/index.ts`:

- `generateFsRoutes`
- `generateLayouts`
- `watchAndGenerate`
- `composeRoutes`
- route-related types

## Generation pipeline

Implemented in `framework/packages/router/src/generate.ts`.

### Route generation (`generateFsRoutes`)

Input defaults:

- pages dir: `./web/pages`
- route TS output: `./core/router/.generated/routes.ts`
- manifest JSON output: `./core/router/.generated/manifest.json`

Process:

1. Recursively walk pages dir.
2. Filter to `.tsx` page modules.
3. Ignore paths containing any segment starting with `_`.
4. Convert file path to route path and segment model.
5. Emit generated TypeScript route array + JSON manifest.

### Segment parsing

`parseSegment` maps names to route segment types:

- `foo` -> `{ kind: 'static', value: 'foo' }`
- `[id]` -> `{ kind: 'param', name: 'id' }`
- `[...slug]` -> `{ kind: 'catchAll', name: 'slug' }`

### File-to-route mapping

`fileToRoute` behavior:

- `index` maps to `/`
- `x/index` maps to `/x`
- trailing `/index` is removed
- route path is normalized to avoid trailing slashes (except root)

## Layout generation (`generateLayouts`)

Input defaults:

- layouts dir: `./web/layouts`
- layouts TS output: `./core/router/.generated/layouts.ts`

Key rules:

- Accept `.ts` and `.tsx` layout modules.
- Ignore `.d.ts`.
- Ignore underscore-prefixed files/folders.
- Normalize layout name from relative path without extension.

## Watch mode (`watchAndGenerate`)

Design characteristics:

- watches pages and layouts trees,
- debounces regeneration (`120ms`),
- rescans directories when needed,
- avoids concurrent overlapping runs with rerun flag.

This prevents duplicate generation churn during rapid file events.

## Client runtime internals

Implemented in `framework/packages/router/src/client/router.tsx`.

### Route matching algorithm

`matchRoute(segments, pathname)`:

1. normalize/split pathname,
2. walk each route segment,
3. enforce static matches,
4. decode params,
5. decode catch-all arrays,
6. require exact consumption of path segments.

A route only matches when all segments are consumed cleanly.

### Metadata application

`applyMetadata(meta)` updates:

- `document.title`
- `<meta name="description">`

This is done after page module import.

### Layout resolution

Pages can export `layout` as:

- string layout name, or
- function returning layout name.

The runtime resolves layout loader from generated layout map.
Unknown layouts produce a warning but do not crash immediately.

### Router state and hooks

`RouterContext` carries:

- pathname
- search
- params
- query
- navigate function

Hooks built on this context:

- `useParams`
- `useQuery`
- `useLocation`
- `useNavigate`

### Navigation mechanics

`navigate(to)` uses:

- `history.pushState`
- synthetic `PopStateEvent`

This keeps the state update path unified for link clicks and programmatic nav.

## Code example: generated route record shape

```ts
export const routes: Route[] = [
  {
    file: "about.tsx",
    path: "/about",
    segments: [{ kind: "static", value: "about" }],
    importPage: () => import("../../web/pages/about.tsx"),
  },
]
```

## Code example: route module contract

```tsx
export const metadata = {
  title: "About",
  description: "About page",
}

export const layout = "global"

export default function AboutPage() {
  return <main>About</main>
}
```

## Extension points

Safe router extension points:

- new segment conventions (requires parser + matcher + docs updates),
- extra metadata fields (requires runtime handler),
- generation output augmentations (manifest schema versioning recommended).

Avoid changing output signatures without migration strategy.
