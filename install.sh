#!/usr/bin/env bash
set -euo pipefail

# Dex GitHub-only installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<ref>/install.sh | bash
#   DEX_VERSION=v0.2.0 curl -fsSL .../install.sh | bash
#   DEX_HOME=~/.dex curl -fsSL .../install.sh | bash

DEX_REPO="${DEX_REPO:-patrickaigbogun/dex}"
DEX_VERSION="${DEX_VERSION:-latest}"
DEX_HOME="${DEX_HOME:-${HOME}/.dex}"
DEX_BIN_DIR="${DEX_HOME}/bin"

uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "${uname_s}" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "Windows is not supported by this installer. Use install.ps1 or the .exe asset from GitHub Releases." >&2
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

# Resolve tag name if latest
resolved_tag="${DEX_VERSION}"
if [[ "${DEX_VERSION}" == "latest" ]]; then
  if command -v curl >/dev/null 2>&1; then
    tag_api=$(curl -fsSL "https://api.github.com/repos/${DEX_REPO}/releases/latest" 2>/dev/null | grep '"tag_name":' | head -n1 | sed -E 's/.*"([^"]+)".*/\1/' || true)
    if [[ -n "${tag_api}" ]]; then
      resolved_tag="${tag_api}"
    fi
  fi
fi

if [[ "${resolved_tag}" == "latest" ]]; then
  url="${base}/latest/download/${asset}"
else
  url="${base}/download/${resolved_tag}/${asset}"
fi

version_dir="${DEX_HOME}/versions/${resolved_tag}"
mkdir -p "${version_dir}" "${DEX_BIN_DIR}"
out="${version_dir}/dex"

echo "Installing Dex (${asset}) from ${DEX_REPO}@${resolved_tag} -> ${out}" >&2

# prefer curl; fallback to wget
if command -v curl >/dev/null 2>&1; then
  curl -# -fL "${url}" -o "${out}"
elif command -v wget >/dev/null 2>&1; then
  wget --show-progress -qO "${out}" "${url}"
else
  echo "Missing downloader: install curl or wget" >&2
  exit 1
fi

chmod +x "${out}"

# Link ~/.dex/current -> ~/.dex/versions/<version>
current_link="${DEX_HOME}/current"
rm -rf "${current_link}"
ln -s "${version_dir}" "${current_link}"

# Link ~/.dex/bin/dex -> ~/.dex/current/dex
bin_link="${DEX_BIN_DIR}/dex"
rm -f "${bin_link}"
ln -s "${current_link}/dex" "${bin_link}"

# Backward compatibility: link ~/.local/bin/dex if directory exists
if [[ -d "${HOME}/.local/bin" && "${HOME}/.local/bin" != "${DEX_BIN_DIR}" ]]; then
  rm -f "${HOME}/.local/bin/dex" 2>/dev/null || true
  ln -s "${bin_link}" "${HOME}/.local/bin/dex" 2>/dev/null || true
fi

echo "Installed Dex ${resolved_tag} to ${out}" >&2
echo "Active symlink: ${bin_link}" >&2

# Check if ~/.dex/bin is in PATH
case ":${PATH}:" in
  *":${DEX_BIN_DIR}:"*) ;;
  *)
    echo "" >&2
    echo "To add dex to your PATH, add the following to your shell profile (~/.bashrc, ~/.zshrc, etc.):" >&2
    echo "  export PATH=\"${DEX_BIN_DIR}:\$PATH\"" >&2
    ;;
esac

echo "" >&2
echo "Next:" >&2
echo "  dex --help" >&2
