# Dex Technical Deep Dive

This section is for engineers and coding agents who need to understand how Dex works internally and how to modify it safely.

## Who this is for

- Engineers integrating Dex into production systems.
- Maintainers extending framework internals.
- Agents making targeted changes in existing Dex codebases.

## Reading order

1. [Architecture Deep Dive](./01-architecture-deep-dive.md)
2. [Router Internals](./02-router-internals.md)
3. [Server Internals](./03-server-internals.md)
4. [CLI Internals and Versioning](./04-cli-internals.md)
5. [Dev Supervisor Internals](./05-dev-supervisor.md)
6. [Template and Registry Engineering Model](./06-template-registry-model.md)
7. [How Not to Use Dex (Anti-Patterns)](./07-how-not-to-use-dex.md)
8. [Agent Playbook for Safe Modifications](./08-agent-playbook.md)

## Important assumptions

This deep dive reflects the current implementation in:

- `framework/packages/router`
- `framework/packages/server`
- `framework/packages/dev`
- `framework/packages/cli`
- `templates/starter`

If behavior differs in a consuming app, treat app code as the final source of truth.
