---
title: "Getting Started"
---

# Getting Started with Dex

Welcome! Dex is a Bun-first framework for building web applications with file-based routing, zero-config defaults, and a focus on simplicity.

## What You'll Learn

- What Dex is and why you'd use it
- How to scaffold your first app in 5 minutes
- How to develop, build, and deploy

## Installation

Install the Dex CLI on your system:

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

To update an existing installation to the latest version at any time, run:
```bash
dex update
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

1. [What is Dex?](./what-is-dex) — Understand the philosophy and architecture
2. [Your First App](./your-first-app) — Step-by-step tutorial building a real app
3. [How Dex Works](./how-dex-works) — Mental model for routing, layouts, and builds