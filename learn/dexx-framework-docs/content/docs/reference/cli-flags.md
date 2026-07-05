---
title: "Cli Flags"
---

# CLI Flags

All command-line options for Dex tools.

## Router CLI

```bash
bunx dex-router generate [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--pagesDir` | `web/pages` | Pages directory |
| `--layoutsDir` | `web/layouts` | Layouts directory |
| `--outTs` | `core/router/.generated/routes.ts` | Output file |
| `--outJson` | `core/router/.generated/manifest.json` | JSON manifest |

## Dev CLI

```bash
bun run dev [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | 7990 | Server port |
| `--pagesDir` | `web/pages` | Pages directory |
| `--no-hot` | false | Disable hot reload |

## Build CLI

```bash
bun run build [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--outDir` | `build` | Output directory |
| `--minify` | true | Minify output |

## Precedence

CLI flags override config file values, which override defaults.