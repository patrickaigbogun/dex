# How a Request Flows Through Dex

Understanding request flow helps new users reason about behavior quickly.

## Development flow (typical SPA setup)

1. Browser requests a route.
2. Server checks whether it is an API request, asset request, or app route.
3. Assets are served directly when path targets asset files.
4. API routes are handled by API handlers.
5. Non-asset/non-API routes fall back to app HTML.
6. Client router loads generated route metadata and renders the page.
7. Optional dev reload channel notifies browser for refresh behavior.

## Production flow

1. Browser requests static assets from build output.
2. Server returns assets for known static paths.
3. API requests are handled by API app routes.
4. Unknown browser navigation paths use SPA fallback to return entry HTML.
5. Client router resolves route and layout modules from generated mapping.

## Why generated metadata is important

Generated route/layout metadata ensures runtime loading stays deterministic.

Without generation, runtime route discovery can be slower and less predictable.

## Request classification model

A useful mental model:

- `/api/*` → API domain
- `/assets/*` → static asset domain
- route with file extension (for example `.js`, `.css`, `.png`) → static file domain
- everything else → app route domain (SPA fallback)

## Error behavior guidance

Good Dex apps should clearly separate:

- API errors (JSON error responses).
- Missing static files (404 static behavior).
- Route-level rendering failures (client-side error boundaries where applicable).

## Performance notes

- Route generation shifts work to build/dev-time.
- Asset and API separation keeps request handling simple.
- Lightweight server helpers avoid unnecessary runtime complexity.
