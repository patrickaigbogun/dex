# What is Dex?

Dex is a composable framework toolkit built around Bun.

Instead of one giant runtime, Dex gives you focused packages that work together:

- A file-based router generator.
- A lightweight client router runtime.
- Server helpers for assets, SPA fallback, and dev reload.
- A small dev process supervisor.
- A CLI for scaffolding and common project actions.

## The short version

Dex helps you build web applications with clear conventions and minimal hidden magic.

You control your app architecture.
Dex provides the practical pieces that are usually repetitive:

- Route generation from files.
- Server behavior for SPA and assets.
- Developer workflow helpers.

## Why Dex exists

Most teams need the same baseline capabilities:

- Routing conventions that are easy to read.
- Predictable build and development loops.
- A clean split between app code and framework utilities.

Dex packages these capabilities into small modules so teams can adopt them incrementally.

## What Dex is not

Dex is not designed as a rigid all-in-one platform.

It does not try to hide everything behind one abstraction layer.
It is intentionally explicit:

- You can see where routes come from.
- You can see what the server plugins do.
- You can see how development scripts are orchestrated.

## Typical high-level architecture

A typical Dex app has:

1. `web/pages` for route files.
2. `web/layouts` for reusable layout modules.
3. Generated routing metadata under a `.generated` directory.
4. A server app using Dex server helpers.
5. A bootstrap entry that mounts the client router.

## Who should use Dex

Dex is a strong fit when you want:

- File-based routing without a large framework runtime.
- Control over server behavior while keeping good defaults.
- A Bun-first developer experience.

## First mental model

Think of Dex as:

- conventions +
- generation +
- composable packages

rather than a single monolithic framework runtime.
