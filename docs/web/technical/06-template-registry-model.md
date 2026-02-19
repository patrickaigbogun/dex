# Template and Registry Engineering Model

This section formalizes the architecture assumptions for template workflows.

## Current direction (from roadmap)

- Registry is centralized for discovery + metadata.
- Template source remains public Git repositories.
- No mandatory mirrored template blob storage in registry.

## Engineering implications

### Pros

- simple storage model,
- clear source provenance,
- lower ops cost.

### Trade-offs

- availability tied to Git provider uptime,
- additional validation complexity at install/update time,
- need robust URL/tag normalization.

## Recommended metadata model

Store metadata entries like:

- template id
- provider + repo URL
- version/tag
- SHA fingerprint
- optional component map
- publish timestamp

This supports reproducibility without content duplication.

## Manifest lifecycle

`composer.json`-style manifest can be:

1. partially authored by maintainer,
2. completed/validated by registry UI,
3. consumed by CLI for deterministic installs.

## Security contract (must-have)

At minimum enforce:

- allowed file patterns,
- blocked file patterns,
- path traversal protections,
- symlink/executable policy,
- max file size,
- max directory depth,
- fingerprint verification.

## Incremental update model

For updates:

- compare file sets/hashes,
- copy only changed files,
- preserve local modifications policy explicitly.

Define conflict policy early (overwrite, skip, prompt, or merge strategy).

## Testing matrix recommendation

For Git providers, test:

1. URL parsing/normalization,
2. tag resolution,
3. release asset download,
4. auth/no-auth behavior,
5. rate-limit and timeout handling,
6. malformed repo/tag cases.
