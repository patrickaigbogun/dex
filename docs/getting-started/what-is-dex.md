# What is Dex?

Dex is a **Bun-first web framework** that combines file-based routing with a minimal configuration approach. It's designed for developers who want to ship fast web applications without wrestling with complex tooling.

## Why Dex?

| Problem | Dex Solution |
|---------|--------------|
| Complex routing configs | File-based routing — your folder structure *is* your routes |
| Build tool fatigue | Zero-config defaults with Bun's speed |
| Confusing layouts | Explicit layout files that compose naturally |
| Deployment friction | Single binary output, ready for any platform |

## Key Features

- **File-based routing**: `web/pages/about.tsx` → `/about`
- **Automatic layout composition**: `web/layouts/global.tsx` wraps all pages
- **Config-driven paths**: Customize folder structure via `dex.config.ts`
- **SPA fallback**: Automatic client-side navigation for dynamic routes
- **Dev/prod parity**: Same mental model, different modes

## How It Compares

| Framework | Routing | Config |
|-----------|---------|--------|
| Next.js | File-based | `next.config.js` |
| Dex | File-based | `dex.config.ts` (optional) |
| Remix | Convention-based | `remix.config.js` |
| Express | Manual | Manual |

## When to Use Dex

- Building a marketing site, blog, or dashboard
- You want file-based routing without framework lock-in
- Deploying to platforms that support Node/Bun binaries
- You prefer explicit over magical

## Example Structure

```
my-app/
├─ dex.config.ts      # Optional configuration
├─ web/
│  ├─ pages/          # Routes (index.tsx → /)
│  │  ├─ about.tsx    # /about
│  │  └─ [id]/        # Dynamic route /:id
│  ├─ layouts/        # Layout components
│  └─ public/         # Static assets
└─ core/              # Generated files (don't edit)
```

## Ready to Try It?

[Proceed to Your First App](./your-first-app) to scaffold and run your first Dex application.