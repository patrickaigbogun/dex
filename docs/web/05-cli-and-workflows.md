# CLI and Developer Workflows

This section explains day-to-day usage patterns in plain language.

## Scaffolding workflow

Goal: start a new Dex project quickly.

Typical steps:

1. Run scaffold command.
2. Choose project mode when prompted.
3. Template is fetched/extracted.
4. Project files are finalized.
5. Dependencies are installed (unless skipped).

## Sync workflow

Goal: sync template changes into an existing project safely.

Typical steps:

1. Detect Dex project context.
2. Resolve template metadata and release tag.
3. Fetch template diff.
4. Apply all changes or selected changes.
5. Update local metadata.

## Build workflow

Goal: produce production-ready output.

Typical steps:

1. Resolve project root.
2. Run configured build script.
3. Emit build artifacts.

## Start workflow

Goal: run app in development or production mode.

- Dev mode runs watch/dev scripts.
- Production mode runs production start path.

## Tag workflow (maintainers)

Goal: bump and push release tags with simple commands.

### Command shape

- `dex tag patch`
- `dex tag minor`
- `dex tag major`

### SemVer behavior

- patch: increments patch segment by one.
- minor: increments minor, resets patch to zero.
- major: increments major, resets minor and patch to zero.

### Operational behavior

After calculating the next tag, CLI runs tag creation and push commands.

## Recommended team practices

- Keep clear release notes per version.
- Validate generated artifacts in CI.
- Treat tag bump commands as release operations.
- Use a staging branch or release branch for production tag workflows.
