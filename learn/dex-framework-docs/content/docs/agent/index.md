---
title: "Agent"
---

# Dex (Agent Docs)

Fast references for working inside this repo.

## Key paths

- Packages: `framework/packages/*`
- Example app/template: `templates/starter/`
- Documentation sections: [`../router/`](../router/), [`../server/`](../server/), [`../dev/`](../dev/), [`../cli/`](../cli/), [`../pie/`](../pie/)

## Run commands (starter)

```bash
cd templates/starter
dex start
```

```bash
cd templates/starter
dex build
cd build
PORT=7990 ./server
```

API-only:

```bash
cd templates/starter/build
DEX_API_ONLY=1 PORT=7990 ./server
```

## References

- Router agent reference: [`router.md`](./router)
- Server helper reference: [`server.md`](./server)
- Dev supervisor reference: [`dev.md`](./dev)
- CLI reference: [`cli.md`](./cli)
- Pie (typed client) reference: [`pie.md`](./pie)
