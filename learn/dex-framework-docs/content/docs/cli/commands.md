---
title: "Commands"
---

# CLI Commands

The Dex CLI (`dex`) provides commands for scaffolding projects, syncing upstream updates, managing release tags, building, and running applications.

## Overview

```bash
dex scaffold <dir> [options]
dex sync [--interactive] [options]
dex update [version] [--force]
dex versions | dex list
dex use <version>
dex pie generate [spec-url-or-file] [options]
dex tag <patch|minor|major>
dex build
dex start [-p]
dex -v / --version [-f]
```

---

## `dex scaffold`

Scaffold a new Dex project in the specified directory.

```bash
dex scaffold <dir> [options]
```

When run, `dex scaffold` prompts you to choose the project type (`spa` or `mpa`), downloads and extracts the template archive and framework package archives (`router`, `server`, `dev`, `pie`) into the `packages/` directory, initializes `.dex/metadata.json`, and runs `bun install` by default.

### Options

| Option | Description |
|--------|-------------|
| `--repo <owner/repo>` | GitHub repository containing release templates (default: `patrickaigbogun/dex`) |
| `--tag <tag\|latest>` | Release tag to download template from (default: `latest`) |
| `--packages-repo <owner/repo>` | GitHub repository containing `dex-package-*.tgz` assets |
| `--packages-tag <tag\|latest>` | Release tag for `dex-package-*.tgz` assets (default: template tag) |
| `--template <path>` | Use a local template `.tgz` archive instead of downloading from GitHub |
| `--template-url <url>` | Download template `.tgz` archive from a direct URL (skips GitHub API) |
| `--no-install` | Do not run `bun install` after scaffolding |

### Examples

```bash
# Scaffold in a new directory
dex scaffold my-app

# Scaffold using a specific release tag
dex scaffold my-app --tag v0.1.44

# Scaffold from a custom GitHub repository
dex scaffold my-app --repo myorg/dex-templates --tag v1.0.0

# Scaffold from a local archive without installing dependencies
dex scaffold my-app --template ./custom-template.tgz --no-install

# Scaffold from a direct URL
dex scaffold my-app --template-url https://example.com/templates/dex-template-spa.tgz
```

---

## `dex sync`

Sync upstream template changes and updates into an existing Dex project.

```bash
dex sync [options]
```

`dex sync` reads template metadata from `.dex/metadata.json`, fetches the diff manifest (`dex-diff-<tag>.json`) from the release, downloads the template archive, and copies changed files into your project root while preserving project metadata.

### Options

| Option | Description |
|--------|-------------|
| `--interactive` | Interactively select which files to sync from the release diff |
| `--repo <owner/repo>` | Template GitHub repository (default: read from `.dex/metadata.json` or `DEX_TEMPLATE_REPO`) |
| `--tag <tag>` | Release tag to sync with (default: `releaseTag` from metadata or latest release) |

### Examples

```bash
# Automatically sync all changed files from the current/latest release
dex sync

# Interactively choose which changed files to apply
dex sync --interactive

# Sync against a specific release tag and repository
dex sync --repo myorg/dex --tag v0.2.0
```

---

## `dex update`

Update the Dex CLI to the latest release (or a specific version) with multi-version storage.

```bash
dex update [version] [options]
```

`dex update` checks GitHub Releases for newer versions, downloads the pre-compiled binary for your OS and architecture into `~/.dex/versions/<version>/dex`, displays live download progress, and atomically updates the active symlink (`~/.dex/current` and `~/.dex/bin/dex`).

### Options

| Option | Description |
|--------|-------------|
| `[version]` | Specific version tag to install (e.g. `v0.2.0`). Defaults to latest GitHub release. |
| `--force` | Force re-download even if already on the target version. |
| `--repo <owner/repo>` | Release repository (default: `patrickaigbogun/dex` or `DEX_TEMPLATE_REPO`). |

### Examples

```bash
# Update to latest stable release
dex update

# Install and switch to a specific version
dex update v0.2.0

# Force re-downloading current version
dex update --force
```

---

## `dex versions` / `dex list`

List all locally installed Dex CLI versions stored in `~/.dex/versions/`.

```bash
dex versions
# or
dex list
# or
dex ls
```

Displays installed versions and marks the currently active version with `* (active)`.

### Examples

```bash
dex versions
```

Output:
```
Dex installed versions (~/.dex):

  * v0.2.0 (active)
    v0.1.44
```

---

## `dex use`

Switch the active CLI version to another already-installed version.

```bash
dex use <version>
```

Atomically points `~/.dex/current` to `~/.dex/versions/<version>/` and updates `~/.dex/bin/dex`.

### Examples

```bash
dex use v0.1.44
# Now using Dex v0.1.44 ✓

dex use v0.2.0
# Now using Dex v0.2.0 ✓
```

---

## `dex pie generate`

Generate a fully typed route-tree API client from an OpenAPI specification.

```bash
dex pie generate [spec-url-or-file] [options]
```

Generates a typed route tree into `core/api/generated.ts` (or custom path) that maps HTTP methods and paths into nested method calls with full parameter and response typing.

### Options

| Option | Description |
|--------|-------------|
| `[spec-url-or-file]` | Path to a local OpenAPI JSON/YAML file, or a URL to a remote schema. |
| `--out <path>` | Output TypeScript file path (default: `core/api/generated.ts`). |
| `--prefix <prefix>` | Route path prefix to strip from generated client tree (default: `/api`). |
| `--url <baseUrl>` | Default base API URL (default: inferred from `dex.config.ts` `apiUrl` or `PUBLIC_API_URL`). |

### Examples

```bash
# Generate from local OpenAPI file
dex pie generate ./openapi.json

# Generate from remote URL
dex pie generate https://api.example.com/openapi.json

# Custom output path and prefix
dex pie generate ./openapi.json --out core/api/client.ts --prefix /v1
```

---

## `dex tag`

Bump SemVer version tags and push the tag to the git remote.

```bash
dex tag <patch|minor|major>
```

Inspects existing git tags matching `v*`, determines the current highest SemVer version, computes the incremented version, creates the git tag, and pushes it to `origin`.

### Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `patch` | Bump SemVer patch version | `v0.1.44` → `v0.1.45` |
| `minor` | Bump SemVer minor version | `v0.1.44` → `v0.2.0` |
| `major` | Bump SemVer major version | `v0.1.44` → `v1.0.0` |

### Examples

```bash
# Create and push a patch release tag
dex tag patch

# Create and push a minor release tag
dex tag minor

# Create and push a major release tag
dex tag major
```

---

## `dex build`

Build the Dex application for production.

```bash
dex build
```

Discovers the project root (by looking for `dex.config.*`, `config/dex.config.*`, or `package.json` with a `dex` property) and runs `bun run build`.

---

## `dex start`

Start the Dex application in development or production mode.

```bash
dex start [-p]
```

Discovers the project root, reads configuration from `dex.config.*` (or `package.json`), resolves the configured `port`, and starts the server.

### Options

| Option | Description |
|--------|-------------|
| `-p` | Production mode. Sets `NODE_ENV=production` and runs `bun run start`. Without `-p`, runs in development mode (`bun run dev`). |

### Examples

```bash
# Start development server
dex start

# Start production server
dex start -p
```

---

## Version Flags

Check the version of the Dex CLI and scaffolded project template.

```bash
# Show CLI version
dex -v
dex --version

# Show CLI version and framework template version
dex --version -f
dex -v -f
```

### Options

| Flag | Description |
|------|-------------|
| `-v`, `--version` | Display the `@dex/cli` version (e.g. `dex 0.1.0`) |
| `-f` | Used with `--version` to also display the template version from `.dex/metadata.json` (e.g. `template: v0.1.44`) |

---

## Environment Variables

The Dex CLI supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEX_HOME` | Custom installation and multi-version storage directory | `~/.dex` |
| `DEX_TEMPLATE_REPO` | Default GitHub template repository (`owner/repo`) | `patrickaigbogun/dex` |
| `DEX_TEMPLATE_TGZ` | Path to local template `.tgz` archive (skips GitHub API) | — |
| `DEX_TEMPLATE_URL` | Direct URL to template `.tgz` archive (skips GitHub API) | — |
| `DEX_PACKAGE_REPO` | GitHub repository (`owner/repo`) for `dex-package-*.tgz` assets | Template repo |
| `DEX_PACKAGE_TAG` | Release tag for `dex-package-*.tgz` assets | Template tag |
| `DEX_CACHE_DIR` | Directory for caching downloaded templates and packages | OS cache directory |
| `DEX_TEMPLATE_CACHE_TTL_MS` | Cache TTL in milliseconds for `latest` release downloads | `1800000` (30m) |
| `DEX_FETCH_TIMEOUT_MS` | Network timeout in milliseconds for GitHub API requests | `30000` (30s) |
| `GITHUB_TOKEN` | GitHub Personal Access Token to avoid rate limits or access private repositories | — |

---

## See Also

- [Scaffold](./scaffold) — Guide to scaffolding a new project
- [CLI Flags](../reference/cli-flags) — Quick reference for CLI flags
- [Your First App](../getting-started/your-first-app) — Step-by-step tutorial