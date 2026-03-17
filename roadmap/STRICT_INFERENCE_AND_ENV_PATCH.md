# Roadmap: Strict Inference & Environment Injection Patch

**Priority:** Critical
**Status:** Planned
**Target Date:** March 2026

This roadmap outlines the steps to upstream the "Typed Inference" and "Env Injection" fixes from the starter template exploration into the core `framework` packages and downstream templates.

## Phase 1: Framework Core Fixes (Immediate)

These changes must be applied to `framework/packages/*` to ensure all future projects inherit the fixes.

### 1. Fix Router Type Constraints (`@dex/router`)
**Context:** The `clientOnly` HOC has a loose generic that breaks strict TypeScript checks in consumer apps.
**Action:**
- Edit `framework/packages/router/src/client/router.tsx`.
- Update `clientOnly<P>` to `clientOnly<P extends {}>`.
- **Reason:** Prevents "Type 'P' is not assignable to type 'IntrinsicAttributes'" errors during build.

### 2. Implement Env Injection Helper (`@dex/server`)
**Context:** Client-side bundles crash accessing `process.env` defined in `.env` files.
**Requirement:** Move logic from `scripts/env.ts` (userland) into the main server package.
**Action:**
- Create/Update `framework/packages/server/src/env.ts`.
- Export `getPublicEnvDefines(): string[]`.
- Logic:
    1. Read `.env` (if exists).
    2. Merge with `process.env`.
    3. Filter for `NEXT_PUBLIC_`, `PUBLIC_`, `VITE_` prefixes.
    4. Return array of `--define` flags for Bun.
- Export this from `framework/packages/server/src/index.ts`.

---

## Phase 2: Template Standardization (Starter)

Update `framework/templates/starter` to match the new robust architectural patterns.

### 3. API Architecture Refactor (Typed Inference)
**Context:** API inference is currently fragile.
**Action:**
- **Split API Core:**
    - `core/api/server.ts`: Export concrete `api` instance (factory).
    - `core/api/type.ts`: Export `type Api = typeof import('./server').api`.
    - `core/api/client.ts`: Consume `Api` type for `treaty`.
    - `core/api/index.ts`: Export `api` (server), `Api` (type), `apiClient` (browser) ensuring no circular imports.
- **Explicit Routes:**
    - Update `routes/api/index.ts` to use explicit chaining `.use(a).use(b)` instead of `composeRoutes`.
    - Ensure route modules export concrete instances (`new Elysia()...`).
- **Canary:**
    - Add `routes/api/test.ts` as a permanent type checking canary.

### 4. Build Script Update (Env Injection)
**Context:** Scripts currently lack env injection or duplicate logic.
**Action:**
- Delete `scripts/env.ts` (if it exists in template).
- Update `scripts/dev.ts` and `scripts/build-client.ts` to:
    ```typescript
    import { getPublicEnvDefines } from '@dex/server'
    // ...
    const defineArgs = getPublicEnvDefines()
    // ... pass to Bun.build/spawn
    ```

---

## Phase 3: Validation & Release

### 5. Verification
- Run `dex scaffold` with the new template.
- Verify `bun run dev` injects `NEXT_PUBLIC_` vars correctly to the browser.
- Verify `apiClient.v1.test.get()` has strict typing in VS Code.
- Verify `bun run build` succeeds without type errors.

### 6. Release
- Bump package versions for `@dex/router` and `@dex/server`.
- Publish `framework/templates/starter` update.
