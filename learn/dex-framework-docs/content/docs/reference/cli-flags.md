---
title: "Cli Flags"
---

# CLI Flags

All command-line options for Dex CLI and tooling.

## Dex CLI (`dex`)

### `dex scaffold <dir>`

```bash
dex scaffold <dir> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--repo <owner/repo>` | `patrickaigbogun/dex` | GitHub repository containing release templates |
| `--tag <tag\|latest>` | `latest` | Release tag to download template from |
| `--packages-repo <owner/repo>` | (template repo) | GitHub repository containing `dex-package-*.tgz` assets |
| `--packages-tag <tag\|latest>` | (template tag) | Release tag for framework packages |
| `--template <path>` | — | Local template `.tgz` archive path (skips GitHub API) |
| `--template-url <url>` | — | URL to template `.tgz` archive (skips GitHub API) |
| `--no-install` | `false` | Skip running `bun install` after scaffolding |

### `dex sync`

```bash
dex sync [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--interactive` | `false` | Interactively select files to sync |
| `--repo <owner/repo>` | Metadata repo | Template repository |
| `--tag <tag>` | Metadata releaseTag / `latest` | Release tag to sync |

### `dex start`

```bash
dex start [-p]
```

| Flag | Default | Description |
|------|---------|-------------|
| `-p` | `false` | Run production server (`NODE_ENV=production`) |

### Version Flags

| Flag | Description |
|------|-------------|
| `-v`, `--version` | Print CLI version |
| `--version -f`, `-v -f` | Print CLI version and template version from `.dex/metadata.json` |

---

## Router CLI (`dex-router`)

```bash
bunx dex-router generate [options]
bunx dex-router watch [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--pagesDir` | `web/pages` | Pages directory containing route components |
| `--layoutsDir` | `web/layouts` | Layouts directory containing layout modules |
| `--outRoutesTs` | `core/router/.generated/routes.ts` | Output path for generated TypeScript routes file |
| `--outRoutesJson` | `core/router/.generated/manifest.json` | Output path for generated JSON route manifest |
| `--outLayoutsTs` | `core/router/.generated/layouts.ts` | Output path for generated TypeScript layouts map |

---

## Dev CLI

```bash
bun run dev [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | 7990 | Server port |
| `--pagesDir` | `web/pages` | Pages directory |
| `--no-hot` | false | Disable hot reload |

---

## Build CLI

```bash
bun run build [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--outDir` | `build` | Output directory |
| `--minify` | true | Minify output |

---

## Precedence

CLI flags override config file values, which override defaults.