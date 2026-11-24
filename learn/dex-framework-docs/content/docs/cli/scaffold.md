---
title: "Scaffold"
---

# Scaffold a New Project

Create a new Dex project with `dex scaffold <dir>`.

## Command

```bash
dex scaffold <dir> [options]
```

## How It Works

When you run `dex scaffold <dir>`:

1. **Prepares Destination Directory**: Creates `<dir>` and verifies it is empty.
2. **Project Type Selection**: Uses `--mode <spa|mpa>` or interactively prompts you to choose:
   - `spa` — Single-Page Application template (`dex-template-spa.tgz`)
   - `mpa` — Multi-Page Application template (`dex-template-mpa.tgz`)
3. **Resolves & Caches Template**: Downloads the template archive from GitHub Releases (using the local OS template cache unless `--no-cache` or `--fresh` is passed), a direct `--template-url`, or a local `--template` `.tgz` file. Archive extraction enforces path-traversal checks (`SafeJoin`), rejects symlinks/hardlinks, and enforces entry and size limits.
4. **Fetches Framework Packages**: Downloads bundled framework package tarballs (`router`, `server`, `dev`, `pie`), extracts them into `packages/`, creates `packages/index.ts`, and records `dex.packageVersions` in `package.json`.
5. **Initializes Metadata**: Creates `.dex/metadata.json` to track the template version and release tag for future `dex sync` updates.
6. **Verifies Project Structure**: Checks that `package.json`, `dex.config.*`, and `packages/*` are present.
7. **Installs Dependencies**: Runs `bun install` inside `<dir>` (unless `--no-install` is passed).

## Options

| Option | Description | Default |
|---|---|---|
| `--mode <spa\|mpa>` | Skip interactive prompt and select project type | Interactive prompt |
| `--repo <owner/repo>` | GitHub repository containing template release assets | `patrickaigbogun/dex` |
| `--tag <tag\|latest>` | Release tag to download template from | `latest` |
| `--packages-repo <owner/repo>` | GitHub repository containing `dex-package-*.tgz` assets | Template repository |
| `--packages-tag <tag\|latest>` | Release tag for `dex-package-*.tgz` assets | Template tag |
| `--template <path>` | Path to a local `.tgz` archive (skips GitHub API) | — |
| `--template-url <url>` | Direct URL to download template `.tgz` (skips GitHub API) | — |
| `--no-install` | Skip running `bun install` during scaffolding | `false` |
| `--no-cache`, `--fresh` | Bypass the local template cache and download fresh release assets | `false` |

## Examples

### Basic Scaffolding

```bash
# Scaffold in a new directory
dex scaffold my-blog

# Navigate to the project and start development
cd my-blog
dex start
```

### Bypass Local Cache (`--no-cache` / `--fresh`)

```bash
# Force fresh downloads from GitHub Releases instead of cached tarballs
dex scaffold my-blog --fresh
# or
dex scaffold my-blog --no-cache
```

### Specify Release Tag, Mode, or Custom Repository

```bash
# Pin to a specific release tag non-interactively
dex scaffold my-blog --mode spa --tag v0.2.6

# Use templates from a custom repository
dex scaffold my-blog --repo myorg/dex-templates --tag v1.0.0
```

### Offline / Local Archive Scaffolding

```bash
# Use a pre-downloaded template archive and skip dependency installation
dex scaffold my-blog --template ./dex-template-spa.tgz --no-install

cd my-blog
bun install
```

### Direct URL Scaffolding

```bash
dex scaffold my-blog --template-url https://example.com/templates/dex-template-spa.tgz
```

## What Gets Created

```
my-blog/
├─ .dex/
│  └─ metadata.json       # Template version and sync tracking
├─ dex.config.ts          # Dex framework configuration
├─ package.json           # Dependencies and scripts
├─ tsconfig.json          # TypeScript configuration
├─ core/
│  ├─ bootstrap/          # dev.ts, build.ts, web.tsx
│  └─ runtime/            # Dev and prod Elysia server entrypoints
├─ packages/              # Bundled Dex framework modules
│  ├─ router/             # File-based router package
│  ├─ server/             # Server runtime package
│  ├─ dev/                # Dev server and build tool package
│  ├─ pie/                # Typed API client package
│  └─ index.ts            # Package re-exports
├─ web/
│  ├─ pages/              # File-based route components
│  ├─ layouts/            # Layout components
│  └─ public/             # Static assets and index.html
└─ routes/                # Backend API routes
```

## Next Steps

1. Start development server: `dex start` (or `bun run dev`)
2. Edit pages in `web/pages/`
3. Build for production: `dex build` (or `bun run build`)
4. Run in production: `dex start -p` (or `bun run start`)
5. Keep your project updated with upstream template fixes: `dex sync`

## See Also

- [CLI Commands](./commands) — Full CLI command reference
- [Your First App](../getting-started/your-first-app) — Step-by-step tutorial
- [CLI Flags Reference](../reference/cli-flags) — Flag summary
