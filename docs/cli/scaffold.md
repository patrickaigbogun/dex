# Scaffold a New Project

Create a new Dex project with `dex create`.

## Command

```bash
bunx dex create <project-name>
```

## Example

```bash
bunx dex create my-blog

cd my-blog
bun run dev
```

## What Gets Created

```
my-blog/
├─ dex.config.ts
├─ package.json
├─ tsconfig.json
├─ web/
│  ├─ pages/
│  │  ├─ index.tsx
│  │  └─ about.tsx
│  ├─ layouts/
│  │  └─ global.tsx
│  └─ public/
├─ core/
├─ scripts/
└─ routes/
   └─ api/
```

## Next Steps

1. Edit pages in `web/pages/`
2. Run `bun run dev` to start
3. Build with `bun run build`

## See Also

- [Your First App](../getting-started/your-first-app) — Step-by-step tutorial
- [Commands](./commands) — Other CLI commands