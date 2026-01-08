# Dex (Agent Docs)

Fast references for working inside this repo.

## Key paths

- Packages: `packages/*`
- Example app/template: `templates/starter/`
- Human docs: `docs/human/`

## Run commands (starter)

```bash
cd templates/starter
bun run dev
```

```bash
cd templates/starter
bun run build
cd build
PORT=7990 ./server
```

API-only:

```bash
cd templates/starter/build
DEX_API_ONLY=1 PORT=7990 ./server
```

## References

- Router agent reference: `docs/agent/router.md`
- Server helper reference: `docs/agent/server.md`
- Dev supervisor reference: `docs/agent/dev.md`
- CLI reference: `docs/agent/cli.md`
- Pie (typed client) reference: `docs/agent/pie.md`
