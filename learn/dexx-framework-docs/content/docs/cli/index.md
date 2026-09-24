---
title: "CLI"
---

# CLI

Command-line tools for the Dex framework.

## Topics

- [Scaffold](./scaffold) — Create a new Dex project
- [Commands](./commands) — Full CLI command reference

## Quick Start

```bash
# Scaffold a new project
dex scaffold my-app

# Enter directory
cd my-app

# Start development server
dex start
```

## Available Commands

- `dex scaffold <dir>` — Scaffold a new Dex project
- `dex sync [--interactive]` — Sync template changes from upstream release
- `dex tag <patch|minor|major>` — Bump and push SemVer git release tags
- `dex build` — Build project for production
- `dex start [-p]` — Run development (`dex start`) or production (`dex start -p`) server
- `dex -v` / `dex --version [-f]` — Display CLI and template version info