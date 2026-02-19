# How Not to Use Dex (Anti-Patterns)

This section is intentionally direct.
It describes patterns that create brittle or hard-to-maintain Dex systems.

## 1) Editing generated files as if they are source

**Do not** manually maintain:

- generated routes,
- generated layouts maps,
- generated manifests.

Why this fails:

- generation will overwrite changes,
- source-of-truth becomes unclear,
- debugging route drift gets harder.

Use source pages/layouts and regenerate.

## 2) Putting business logic in framework glue layers

Avoid large business workflows inside:

- bootstraps,
- dev scripts,
- route composition helpers.

Keep business logic in domain modules and handlers.

## 3) Depending on plugin order by accident

In server composition, order is behavior.

Bad pattern:

- fallback mounted too early,
- API/static routes unintentionally swallowed by fallback.

Always mount specific routes before wildcard fallbacks.

## 4) Ignoring path safety in template workflows

If you add extraction or sync behavior, never bypass path normalization and traversal checks.

Supply-chain risk rises quickly in templating systems.

## 5) Building hidden magic around CLI commands

Avoid commands that silently mutate unrelated project state.

Good CLI behavior should be:

- explicit,
- composable,
- scriptable,
- predictable.

## 6) Mixing unstable roadmap assumptions into stable APIs

Do not ship unstable ideas (for example decentralized storage experiments) as hard API contracts too early.

Keep experimental behavior behind clear flags or separate tracks.

## 7) Treating SemVer automation as optional discipline

If release tags are automated, enforce one rule set.

Mixed tag formats create release ambiguity and break automation assumptions.

## 8) Making “agent-friendly” mean “unsafe auto-edits”

Agent workflows should still enforce:

- narrow scope changes,
- deterministic regeneration,
- compile/test checks,
- explicit rollback path.

Automation quality is about reproducibility, not just speed.
