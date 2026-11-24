---
title: "Getting Started"
---

# Getting Started with Dex

Welcome! Dex is a composable, Bun-first full-stack framework featuring a **Native Go CLI (`dex`)** (<8 MB binary, <5ms startup), file-based React routing, Elysia server helpers, SSG prerendering, and a typed OpenAPI route-tree client (`@dex/pie`).

## What You'll Learn

- What Dex is and how its composable packages fit together
- How to install the native Go CLI and scaffold your first app
- How to develop locally, generate typed API clients, and build a standalone Bun server executable

## Prerequisites

- [Bun](https://bun.sh) installed (`bun --version`) for running the app runtime, bundler, and tests

## Installation

Install the native Go `dex` CLI on your system:

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

The installer places versioned binaries under `~/.dex/versions/<version>/dex`, links the active shim at `~/.dex/bin/dex`, and keeps `~/.local/bin/dex` linked when present. To update or switch CLI versions at any time:

```bash
dex update
dex versions
dex use v0.2.6
```

## Quick Start

```bash
# Scaffold a new Dex project
dex scaffold my-app

# Enter the project directory
cd my-app

# Start the dev server
dex start
```

Your app will be running at `http://localhost:7990`.

## Next Steps

1. [What is Dex?](./what-is-dex) — Understand the philosophy and 5-pillar architecture
2. [Your First App](./your-first-app) — Step-by-step tutorial building a real app
3. [How Dex Works](./how-dex-works) — Mental model for routing, layouts, SSG, and builds
