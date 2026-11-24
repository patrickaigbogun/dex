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
| `--no-cache` | `false` | Bypass local template cache |
| `--fresh` | `false` | Force fresh download of template and packages |

### `dex sync`

```bash
dex sync [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--interactive` | `false` | Interactively select files to sync |
| `--repo <owner/repo>` | Metadata repo | Template repository |
| `--tag <tag>` | Metadata releaseTag / `latest` | Release tag to sync |
| `--force` | `false` | Force sync overwriting local changes |
| `--no-cache` | `false` | Bypass cache during sync |
| `--fresh` | `false` | Force fresh fetch |

### `dex template <list|cache|diff>`

```bash
dex template list
dex template cache
dex template diff
```

Manage template cache and inspect template differences.

### `dex update`

```bash
dex update [version] [options]
```

| Flag / Arg | Default | Description |
|------------|---------|-------------|
| `[version]` | `latest` | Specific version tag to download and activate |
| `--force` | `false` | Force re-download even if already installed |
| `--repo <owner/repo>` | `patrickaigbogun/dex` | Repository containing release binaries |

### `dex versions` / `dex list`

```bash
dex versions
```

List all installed versions in `~/.dex/versions/`.

### `dex use <version>`

```bash
dex use <version>`
```

Switch active version symlink to an already installed version.

### `dex pie generate`

```bash
dex pie generate [spec-url-or-file] [options]
```

| Flag / Arg | Default | Description |
|------------|---------|-------------|
| `[spec-url-or-file]` | `dex.config.ts` `apiSpec` | OpenAPI specification file path or URL |
| `--out <path>` | `core/api/generated.ts` | Destination TypeScript output file |
| `--prefix <prefix>` | `/api` | Path prefix to strip from route tree |
| `--url <baseUrl>` | `dex.config.ts` `apiUrl` | Default API base URL for client initialization |

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

## Development & Build Commands

Instead of legacy or fictional flags, use the actual commands and scripts:

### Development

```bash
dex start
# or with port override
dex start -p
# or via package scripts / direct dev task
bun run dev
```

### Production Build

```bash
dex build
# or direct build command
bun run build
```

---

## Precedence

CLI flags override config file values, which override defaults.