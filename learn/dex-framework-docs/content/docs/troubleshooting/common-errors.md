---
title: "Common Errors"
---

# Common Errors

Solutions for common Dex errors.

## Port Already in Use

```
Error: Port 7990 is already in use
```

**Solution:**
```bash
PORT=7991 dex start
```

## `<Link>` Prop Validation Errors

```
Error: Invalid prop supplied to <Link>
```

**Solution:** Ensure `<Link>` components receive valid string `to` props and children, matching router route definitions.

## Router Error Boundary

If a runtime route error occurs, Dex wraps execution in `RouterErrorBoundary`, catching rendering errors and displaying fallback error states.

## Routes Not Generated

```
Error: No pages found
```

**Solution:**
- Ensure pages are in `web/pages/`
- Check file extensions (`.tsx`)
- Restart dev server

## Module Not Found

```
Error: Cannot find module '@dex/server'
```

**Solution:**
- Run `bun install`
- Verify workspace or package symlinks

## TypeScript Errors

```
Error: Type 'X' is not assignable to type 'Y'
```

**Solution:** Run `dex-router generate` or restart TS server.