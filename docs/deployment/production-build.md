# Production Build

Create a production-ready build of your Dex app.

## Build

```bash
bun run build
```

This:
1. Generates routes from pages
2. Bundles client code
3. Compiles server binary
4. Copies static assets

## Output

```
build/
├─ server           # Executable Node.js binary
├─ index.html       # Entry HTML
├─ assets/
│  ├─ client.js
│  └─ styles.css
└─ core/
   └─ router/.generated/
      ├─ routes.ts
      └─ layouts.ts
```

## Run Locally

Test before deploying:

```bash
cd build
PORT=7990 ./server
```

Visit `http://localhost:7990`.

## Environment Variables

| Variable | Value |
|----------|-------|
| `PORT` | Server port (default: 7990) |
| `NODE_ENV` | Always `production` |
| `DEX_API_ONLY` | Set to `1` for API-only mode |

## See Also

- [Production Server](../server/production) — Running in prod
- [Platforms](./platforms) — Deploy to specific platforms