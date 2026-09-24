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

1. **Prepares Destination Directory**: Creates the target folder `<dir>` and verifies it is empty.
2. **Project Type Prompt**: Interactively asks you to choose a project mode:
   - `spa` — Single-Page Application mode (fetches `dex-template-spa.tgz`)
   - `mpa` — Multi-Page Application mode (fetches `dex-template-mpa.tgz`)
3. **Downloads & Extracts Template**: Resolves the template archive from GitHub Releases (or custom URL / local file) and extracts project boilerplate files.
4. **Fetches Framework Packages**: Downloads bundled framework package tarballs (`router`, `server`, `dev`, and `pie`), extracts them into the local `packages/` directory, and sets up `packages/index.ts`.
5. **Initializes Metadata**: Creates `.dex/metadata.json` to track the template version and release tag for future updates and syncs.
6. **Verifies Project Structure**: Checks that required files (`package.json`, `dex.config.*`, `packages/`) are present.
7. **Installs Dependencies**: Automatically runs `bun install` inside the project directory (unless `--no-install` is specified).

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--repo <owner/repo>` | GitHub repository containing template release assets | `patrickaigbogun/dex` |
| `--tag <tag\|latest>` | Release tag to download template from | `latest` |
| `--packages-repo <owner/repo>` | GitHub repository containing `dex-package-*.tgz` assets | Template repository |
| `--packages-tag <tag\|latest>` | Release tag for `dex-package-*.tgz` assets | Template tag |
| `--template <path>` | Path to a local `.tgz` archive (skips GitHub API) | — |
| `--template-url <url>` | Direct URL to download template `.tgz` (skips GitHub API) | — |
| `--no-install` | Skip running `bun install` during scaffolding | `false` |

## Examples

### Basic Scaffolding

```bash
# Scaffold in a new directory
dex scaffold my-blog

# Navigate to the project and start development
cd my-blog
dex start
```

### Specify Release Tag or Custom Repository

```bash
# Pin to a specific release tag
dex scaffold my-blog --tag v0.1.44

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
├─ packages/              # Bundled Dex framework modules
│  ├─ router/             # File-based router package
│  ├─ server/             # Server runtime package
│  ├─ dev/                # Dev server and build tool package
│  ├─ pie/                # UI and page helper package
│  └─ index.ts            # Package re-exports
├─ web/
│  ├─ pages/              # File-based route components
│  │  ├─ index.tsx
│  │  └─ about.tsx
│  ├─ layouts/            # Layout components
│  │  └─ global.tsx
│  └─ public/             # Static assets (images, fonts, etc.)
└─ routes/                # API and endpoint routes
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