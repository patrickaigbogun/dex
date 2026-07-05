---
title: "Build Issues"
---

# Build Failures

Solutions for build and compilation errors.

## Syntax Error in Page Component

```
SyntaxError: Unexpected token '}'
```

**Solution:**
- Check JSX is valid in `.tsx` file
- Ensure exports are correct: `export default function`
- Run `bun run dev` to see full error

## Module Not Found

```
Error: Cannot find module '@dex/router'
```

**Solution:**
```bash
bun install
```

## CSS Not Compiling

**Problem:** Styles not applied after build.

**Solution:**
- Check `web/styles/` files exist
- Ensure CSS import in pages: `import '../styles/index.css'`
- Restart dev server after CSS changes

## Build Output Too Large

**Problem:** `build/` folder is very large.

**Solution:**
- Check for large assets in `web/public/`
- Minification is enabled by default
- Remove unused dependencies

## Port Already in Use

```
Error: Address already in use :::7990
```

**Solution:**
```bash
PORT=7991 bun run dev
```

Or kill the process using the port:
```bash
lsof -i :7990
kill -9 <PID>
```