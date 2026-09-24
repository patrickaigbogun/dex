# Dex GitHub-only installer (Windows PowerShell)
# Usage:
#   iwr -useb https://raw.githubusercontent.com/<owner>/<repo>/<ref>/install.ps1 | iex
#   $env:DEX_VERSION="v0.2.0"; iwr -useb .../install.ps1 | iex
#   $env:DEX_HOME="$HOME\.dex"; iwr -useb .../install.ps1 | iex

$ErrorActionPreference = "Stop"

$DEX_REPO = if ($env:DEX_REPO) { $env:DEX_REPO } else { "patrickaigbogun/dex" }
$DEX_VERSION = if ($env:DEX_VERSION) { $env:DEX_VERSION } else { "latest" }
$DEX_HOME = if ($env:DEX_HOME) { $env:DEX_HOME } else { Join-Path $HOME ".dex" }
$DEX_BIN_DIR = Join-Path $DEX_HOME "bin"

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne "AMD64") {
  throw "Unsupported architecture: $arch (only AMD64 is supported)"
}

$asset = "dex-windows-x64.exe"
$base = "https://github.com/$DEX_REPO/releases"

$resolvedTag = $DEX_VERSION
if ($DEX_VERSION -eq "latest") {
  try {
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$DEX_REPO/releases/latest"
    if ($rel.tag_name) { $resolvedTag = $rel.tag_name }
  } catch {}
}

if ($resolvedTag -eq "latest") {
  $url = "$base/latest/download/$asset"
} else {
  $url = "$base/download/$resolvedTag/$asset"
}

$versionDir = Join-Path $DEX_HOME "versions\$resolvedTag"
New-Item -ItemType Directory -Force -Path $versionDir | Out-Null
New-Item -ItemType Directory -Force -Path $DEX_BIN_DIR | Out-Null

$out = Join-Path $versionDir "dex.exe"

Write-Host "Installing Dex ($asset) from $DEX_REPO@$resolvedTag -> $out" -ForegroundColor Cyan

Invoke-WebRequest -Uri $url -OutFile $out

# Set current junction
$currentLink = Join-Path $DEX_HOME "current"
if (Test-Path $currentLink) { Remove-Item -Force -Recurse $currentLink }
try {
  New-Item -ItemType Junction -Path $currentLink -Target $versionDir | Out-Null
} catch {}

# Create bin wrapper script
$cmdFile = Join-Path $DEX_BIN_DIR "dex.cmd"
"@echo off`r`n`"%~dp0\..\current\dex.exe`" %*`r`n" | Out-File -Encoding ascii -FilePath $cmdFile

Write-Host "Installed Dex $resolvedTag to $out" -ForegroundColor Green
Write-Host "Active executable: $cmdFile" -ForegroundColor Green
Write-Host "Ensure $DEX_BIN_DIR is on your PATH." -ForegroundColor Yellow
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  dex --help"

