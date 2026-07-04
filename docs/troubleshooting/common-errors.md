# Common Errors

Solutions for common Dex errors.

## Port Already in Use

```
Error: Port 7990 is already in use
```

**Solution:**
```bash
# Use a different port
PORT=7991 bun run dev
```

## Routes Not Generated

```
Error: No pages found
```

**Solution:**
- Ensure pages are in `web/pages/`
- Check file extensions (`.tsx`, `.ts`)
- Restart the dev server

## Layout Not Showing

**Problem:** Layout not wrapping pages.

**Solution:**
- Check `web/layouts/global.tsx` exists
- Verify file naming matches page paths
- Restart dev server after layout changes

## Module Not Found

```
Error: Cannot find module '@dex/router'
```

**Solution:**
- Run `bun install` in your project
- Check `package.json` has `@dex/*` dependencies

## TypeScript Errors

```
Error: Type 'X' is not assignable to type 'Y'
```

**Solution:**
- Run `bun run dev` to regenerate types
- Check `dex.config.ts` paths are correct
- Restart TypeScript server (VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server")