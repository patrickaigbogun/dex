# Dex GitHub-only installer (Windows PowerShell)
# Usage:
#   iwr -useb https://raw.githubusercontent.com/<owner>/<repo>/<ref>/install.ps1 | iex
#   $env:DEX_VERSION="v0.1.0"; iwr -useb .../install.ps1 | iex
#   $env:DEX_INSTALL_DIR="$env:LOCALAPPDATA\Dex\bin"; iwr -useb .../install.ps1 | iex

$ErrorActionPreference = "Stop"

$DEX_REPO = if ($env:DEX_REPO) { $env:DEX_REPO } else { "patrickaigbogun/dex" }
$DEX_VERSION = if ($env:DEX_VERSION) { $env:DEX_VERSION } else { "latest" }
$DEX_INSTALL_DIR = if ($env:DEX_INSTALL_DIR) { $env:DEX_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Dex\bin" }

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne "AMD64") {
  throw "Unsupported architecture: $arch (only AMD64 is supported)"
}

$asset = "dex-windows-x64.exe"
$base = "https://github.com/$DEX_REPO/releases"
if ($DEX_VERSION -eq "latest") {
  $url = "$base/latest/download/$asset"
} else {
  $url = "$base/download/$DEX_VERSION/$asset"
}

New-Item -ItemType Directory -Force -Path $DEX_INSTALL_DIR | Out-Null
$out = Join-Path $DEX_INSTALL_DIR "dex.exe"

Write-Host "Installing dex ($asset) from $DEX_REPO@$DEX_VERSION -> $out" -ForegroundColor Cyan

Invoke-WebRequest -Uri $url -OutFile $out

Write-Host "Installed: $out" -ForegroundColor Green
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  $out --help"
Write-Host "Ensure $DEX_INSTALL_DIR is on your PATH." -ForegroundColor Yellow
