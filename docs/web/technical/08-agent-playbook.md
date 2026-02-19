# Agent Playbook for Safe Modifications

This guide is for coding agents and engineers modifying existing Dex codebases.

## Primary objective

Solve the user problem with the smallest safe change while preserving framework invariants.

## Invariants to preserve

1. Generated outputs remain generated.
2. Route conventions stay deterministic.
3. Server plugin order remains intentional.
4. CLI commands remain script-safe.
5. Tag/version behavior remains SemVer-consistent.

## Recommended modification workflow

### Step 1: Locate canonical implementation

Use `framework/packages/*` as canonical package sources.
Template-local copies may be snapshots.

### Step 2: Identify impacted surfaces

Typical impact map:

- router change -> generator + runtime + docs
- server helper change -> helper + starter composition + docs
- CLI change -> parser + command dispatch + usage text + docs

### Step 3: Implement narrow changes

Avoid broad refactors unless required by the request.

### Step 4: Validate in order

1. type/lint checks for changed files,
2. package build,
3. focused runtime smoke test.

### Step 5: Update docs where behavior changed

For behavior/API changes, update both:

- human-readable docs,
- technical docs for maintainers.

## Playbook examples

### Example A: adding router metadata field

Touchpoints:

- route/page type definitions,
- generator output if needed,
- runtime metadata application,
- docs with migration note.

### Example B: adding CLI subcommand

Touchpoints:

- usage output,
- dispatch in `main`,
- isolated command function,
- test/smoke scenario,
- docs page update.

### Example C: changing fallback behavior

Touchpoints:

- `dexSpaFallback` conditions,
- starter server composition,
- deep-link QA checks,
- deployment docs notes.

## Debugging heuristics

- If routing fails: inspect generated route/layout files first.
- If dev reload fails: inspect SSE endpoint + watch targets.
- If scaffold/sync fails: inspect template metadata + release asset availability.
- If start/build fails: inspect project root resolution and script wiring.

## Guardrails for automated agents

- Never edit generated artifacts directly.
- Avoid introducing hidden side effects in CLI commands.
- Keep migration notes for any public behavior shift.
- Prefer deterministic behavior over smart-but-opaque heuristics.

## What “done” looks like

A change is done when:

1. target behavior is implemented,
2. impacted package builds cleanly,
3. docs reflect new behavior,
4. no unrelated behavior was altered.
