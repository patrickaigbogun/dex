# Package Guide

This section explains each core package, what problem it solves, and where it fits.

## `@dex/router`

### Purpose

- Scans file-based pages and layouts.
- Generates route and layout metadata.
- Provides a client runtime for navigation and route rendering.

### What you get

- Predictable route generation from `web/pages`.
- Dynamic segment support.
- Catch-all route support.
- Generated artifacts for runtime usage.

### Why it matters

It removes manual route table maintenance and reduces routing drift.

---

## `@dex/server`

### Purpose

- Adds framework-ready Elysia helpers.
- Handles common HTTP serving concerns.

### Typical helpers

- Assets route helper.
- SPA fallback helper.
- Dev reload stream helper.

### Why it matters

You get practical server behavior quickly, while keeping explicit control.

---

## `@dex/dev`

### Purpose

- Supervises multiple development processes.
- Stops grouped processes when one fails.

### Why it matters

It keeps multi-watch workflows manageable and reduces dev-time process chaos.

---

## `@dex/pie`

### Purpose

- Provides typed client communication patterns.
- Supports reusable request behavior (for example retry/header strategies).

### Why it matters

It improves consistency for frontend-to-API communication.

---

## `@dex/cli`

### Purpose

- Scaffolds projects/templates.
- Runs common framework tasks.
- Supports maintainers with automation commands.

### Maintainer-focused capability

- Tag version bump commands (`patch`, `minor`, `major`) with automated tagging/pushing.

### Why it matters

CLI automation reduces repetitive release and setup mistakes.

---

## How these packages work together

A simple flow:

1. CLI scaffolds or updates project structure.
2. Router package generates route metadata.
3. Server package serves assets + fallback behavior.
4. Dev package supervises local process group.
5. Pie package handles typed API communication.
