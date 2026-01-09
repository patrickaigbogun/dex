# Distribution (GitHub-only)

Dex is distributed via GitHub Releases:

- `dex` is a single compiled binary built with `bun build --compile`.
- Templates are `.tgz` assets (e.g. `dex-template-spa.tgz`).
- `dex scaffold` downloads a template asset from a release and extracts it.

## Install (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

Pin a version:

```bash
DEX_VERSION=v0.1.0 curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

Install location (default `~/.local/bin`):

```bash
DEX_INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | sudo bash
```

## Release assets

- `dex-linux-x64`
- `dex-linux-arm64`
- `dex-darwin-x64`
- `dex-darwin-arm64`
- `dex-windows-x64.exe`
- `dex-template-spa.tgz`

