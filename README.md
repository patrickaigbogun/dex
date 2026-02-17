# Dex

Dex is a composable, Bun-first framework stack for building small full‑stack apps:
- `@dex/router`: file-based React router + generator
- `@dex/server`: Elysia helpers (assets, SPA fallback, dev reload)
- `@dex/dev`: tiny dev process supervisor

Dex is made of composable **packages** (that’s the framework), but distribution is **GitHub-only**:

- A single `dex` CLI binary (compiled with Bun) installed from GitHub Releases.
- Templates shipped as `.tgz` release assets that `dex scaffold` downloads and extracts.

## Repo layout

- `framework/packages/` — composable packages (framework building blocks)
- `templates/starter/` — minimal app template using the packages

## Try the starter

```bash
cd framework
bun install
```

To run the starter template locally, scaffold it into a new app:

```bash
DEX_TEMPLATE_REPO=patrickaigbogun/dex dex scaffold ./myapp --tag latest
cd myapp
dex start
```

## Install `dex` (GitHub Releases)

```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

Pin a version:

```bash
DEX_VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

```powershell
$env:DEX_VERSION="v0.1.0"; irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

Install location (default `~/.local/bin`):

```bash
DEX_INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | sudo bash
```

```powershell
$env:DEX_INSTALL_DIR="$env:LOCALAPPDATA\Dex\bin"; irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

## Release assets

- `dex-linux-x64`
- `dex-linux-arm64`
- `dex-darwin-x64`
- `dex-darwin-arm64`
- `dex-windows-x64.exe`
- `dex-template-spa.tgz`
- `dex-package-router.tgz`
- `dex-package-server.tgz`
- `dex-package-dev.tgz`
- `dex-package-pie.tgz`
