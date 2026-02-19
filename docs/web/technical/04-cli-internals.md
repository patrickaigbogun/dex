# CLI Internals and Versioning

This section explains `@dex/cli` internals, command dispatch, and extension patterns.

## Command surface

Current command model:

- `dex scaffold <dir>`
- `dex sync [--interactive]`
- `dex build`
- `dex start [-p]`
- `dex tag <patch|minor|major>`
- `dex -v|--version` (`--version -f` for template version)

## Main architecture

Core design patterns in `framework/packages/cli/src/cli.ts`:

1. parse args into `positional` + `flags`,
2. dispatch by first positional token,
3. execute command function,
4. fail fast with explicit errors and non-zero exit.

### Step instrumentation

`createSteps()` wraps command stages with:

- start marker,
- elapsed time,
- success/failure reporting.

This makes long operations observable without external tooling.

## Scaffold internals

`cmdScaffold` pipeline:

1. validate destination emptiness,
2. prompt mode selection (`spa|mpa`),
3. resolve template source (local path, URL, or GitHub release),
4. extract template safely,
5. fetch and extract package assets,
6. write metadata and package index,
7. optional dependency install.

### Download/cache behavior

Caching supports:

- custom cache root,
- TTL handling for `latest`,
- authenticated GitHub fetches via `GITHUB_TOKEN`.

## Sync internals

`cmdSync` pipeline:

1. find project root,
2. load metadata (`.dex/metadata.json`),
3. resolve repo/tag,
4. fetch release diff asset,
5. interactive or automatic file selection,
6. extract and copy selected files,
7. update metadata.

## Build/start internals

- `cmdBuild` finds project root and executes `bun run build`.
- `cmdStart` runs dev by default, prod with `-p`, with env-aware port behavior.

## Tag command internals (SemVer)

`cmdTag(kind)` behavior:

1. list existing `v*` tags,
2. parse tags into semver-like tuples,
3. choose highest version,
4. bump based on `kind`:
   - patch -> `x.y.z+1`
   - minor -> `x.(y+1).0`
   - major -> `(x+1).0.0`
5. ensure next tag does not already exist,
6. run:
   - `git tag <next>`
   - `git push origin <next>`

## Code example: adding a new subcommand safely

```ts
if (cmd === 'doctor') {
  await cmdDoctor(flags)
  return
}
```

Recommended pattern:

- keep parser stable,
- add dedicated command function,
- update usage text,
- add clear error messages and exit behavior.

## Security and robustness notes

- path safety is enforced in extraction pipeline (`safeJoin` style checks),
- network operations include timeout handling,
- user prompts are used where metadata is missing to avoid destructive assumptions.

## Anti-fragile extension guidelines

When modifying CLI internals:

1. avoid changing existing command semantics without migration note,
2. preserve non-interactive scriptability,
3. keep command output machine-readable enough for CI logs,
4. add smoke tests for core commands in temp repos.
