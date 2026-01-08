#!/usr/bin/env bash
set -euo pipefail

# Dex GitHub-only installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<ref>/install.sh | bash
#   DEX_VERSION=v0.1.0 curl -fsSL .../install.sh | bash
#   DEX_INSTALL_DIR=~/.local/bin curl -fsSL .../install.sh | bash

DEX_REPO="${DEX_REPO:-patrickaigbogun/dex}"
DEX_VERSION="${DEX_VERSION:-latest}"
DEX_INSTALL_DIR="${DEX_INSTALL_DIR:-${HOME}/.local/bin}"

uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "${uname_s}" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "Windows is not supported by this installer. Use the .exe asset from GitHub Releases." >&2
    exit 1
    ;;
  *)
    echo "Unsupported OS: ${uname_s}" >&2
    exit 1
    ;;
 esac

case "${uname_m}" in
  x86_64|amd64) arch="x64" ;;
  aarch64|arm64) arch="arm64" ;;
  *)
    echo "Unsupported architecture: ${uname_m}" >&2
    exit 1
    ;;
 esac

asset="dex-${os}-${arch}"
base="https://github.com/${DEX_REPO}/releases"

if [[ "${DEX_VERSION}" == "latest" ]]; then
  url="${base}/latest/download/${asset}"
else
  url="${base}/download/${DEX_VERSION}/${asset}"
fi

mkdir -p "${DEX_INSTALL_DIR}"
out="${DEX_INSTALL_DIR}/dex"

echo "Installing dex (${asset}) from ${DEX_REPO}@${DEX_VERSION} -> ${out}" >&2

# prefer curl; fallback to wget
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${url}" -o "${out}"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "${out}" "${url}"
else
  echo "Missing downloader: install curl or wget" >&2
  exit 1
fi

chmod +x "${out}"

echo "Installed: ${out}" >&2

echo "" >&2
echo "Next:" >&2
echo "  dex --help" >&2
