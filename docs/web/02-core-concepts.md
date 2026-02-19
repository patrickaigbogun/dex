# Core Concepts

This section explains the core ideas you need before diving into implementation details.

## 1) Composition over monolith

Dex is split into focused packages.
You combine only what you need.

This keeps projects adaptable and easier to reason about.

## 2) Convention-driven routing

Pages are discovered from the filesystem.
Routes are generated from naming conventions.

Common patterns:

- `index.tsx` becomes `/`
- `foo/index.tsx` becomes `/foo`
- `[id].tsx` becomes `/:id`
- `[...slug].tsx` becomes `/*slug`
- Files or folders starting with `_` are ignored

## 3) Build-time generation, runtime simplicity

Dex generates route/layout metadata ahead of time.
At runtime, the client router consumes this generated map.

Result:

- Less runtime guesswork.
- Predictable imports.
- Cleaner route behavior.

## 4) Server as explicit composition

Dex server behavior is made of small helpers.
You attach these helpers to your server app explicitly.

Examples include:

- Static asset serving.
- SPA fallback routing.
- Dev reload events.

## 5) “Source of truth” for templates

In your roadmap model, template repositories live on Git providers.
A registry stores metadata and discovery info.

That means:

- Template content stays in Git.
- Registry remains lightweight.
- Versioning and integrity checks are metadata-driven.

## 6) Security-first template handling

Template workflows should block risky patterns early.

Examples:

- Path traversal prevention.
- Symlink and dangerous executable checks.
- Size and depth limits.
- Integrity checks via SHA fingerprints.

## 7) Stable mental model for maintainers

For maintainers, keep this sequence in mind:

1. Define structure and rules.
2. Generate metadata.
3. Validate at publish/install time.
4. Automate repetitive tasks in CLI.
5. Test end-to-end across providers.

## 8) Versioning discipline

The roadmap and CLI should enforce clear version movement.
Use predictable SemVer behavior and automation to reduce release mistakes.
