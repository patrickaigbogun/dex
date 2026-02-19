# Template System and Registry Model

This section documents the template lifecycle and registry architecture in a way that is easy to explain to new teams.

## Core model

- Template repositories are hosted on Git providers.
- Registry acts as discovery and metadata layer.
- Registry does not need to mirror full template contents.

## Why this model works

- Lower infrastructure cost.
- Simple ownership model (source remains in Git).
- Better traceability through tags and commit history.

## Template lifecycle

1. Maintainer creates template structure (CLI-assisted).
2. Maintainer pushes repository/tag to Git provider.
3. Registry validates repository and structure.
4. Registry stores metadata (version, hash, mapping).
5. Consumers install/update template through CLI workflows.

## Manifest (`composer.json`) workflow

Planned/roadmapped behavior:

- Template can start without full manifest.
- Registry UI can generate or prefill manifest after push.
- Version resolution should remain reproducible.

## Security and validation

Recommended baseline checks:

- File blacklist rules.
- Path traversal detection.
- Symlink and executable restrictions.
- File size and depth limits.
- SHA fingerprint generation and verification.

## Incremental updates

Roadmapped behavior:

- During install/update, only changed files are copied.
- Useful for large templates and safer update workflows.

## What to postpone

Based on your roadmap direction:

- Decentralized storage experiments.
- API-key-based CLI-to-registry auth.
- Community-managed blacklist governance.

These can come after core validation and publish/install loops are stable.
