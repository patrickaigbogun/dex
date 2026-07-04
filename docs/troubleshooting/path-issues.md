# Path and Routing Issues

Solutions for routing and path resolution problems.

## 404 After Refresh

**Problem:** Page works with client-side navigation but returns 404 on refresh.

**Solution:** Ensure SPA fallback is enabled in server:

```ts
import { dexSpaFallback } from '@dex/server'

app.use(dexSpaFallback())
```

## Routes Not Generating

**Problem:** `dex-router generate` finds no routes.

**Solution:**
- Check `web/pages/` exists with `.tsx` files
- Verify `dex.config.ts` `pagesDir` path is correct
- Run `bun install` to ensure dependencies are installed

## Configuration Paths Not Working

**Problem:** Config values not being used.

**Solution:**
- CLI flags override config: `bun run dev --pagesDir src/views`
- Config must be `dex.config.ts` or `dex.config.js` in project root
- Restart dev server after config changes

## Dynamic Route Not Matching

**Problem:** `/users/123` doesn't match `[id].tsx`.

**Solution:**
- Check route file is in `web/pages/users/[id].tsx`
- Parameter name must match in code: `const { id } = useParams()`
- Ensure no conflicting static routes

## Catch-All Route Matching Everything

**Problem:** `[...slug].tsx` matches too much.

**Solution:**
- Place catch-all last in folder structure
- Use more specific routes first: `/admin` before `[...slug]`
- Check for duplicate routes