# CLI Commands

All Dex CLI commands.

## dex create

Scaffold a new project.

```bash
bunx dex create <project-name>
```

| Option | Description |
|--------|-------------|
| `--template` | Use a specific template |
| `--typescript` | Use TypeScript (default) |

## dex-router

Router CLI for route generation.

```bash
bunx dex-router generate [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--pagesDir` | `web/pages` | Pages directory |
| `--layoutsDir` | `web/layouts` | Layouts directory |
| `--outTs` | `core/router/.generated/routes.ts` | Routes output |

## bun run dev

Start development server.

```bash
bun run dev [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | 7990 | Server port |
| `--no-hot` | false | Disable hot reload |

## bun run build

Build for production.

```bash
bun run build [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--outDir` | `build` | Output directory |
| `--minify` | true | Minify output |

## bun run start

Run production server.

```bash
cd build
bun run start
```

Or directly:

```bash
./build/server
```

## See Also

- [CLI Flags](../reference/cli-flags) — Full reference
- [Scaffold](./scaffold) — Create a new project