# Operations and Deployment

This section explains practical operations concerns for teams shipping Dex apps.

## Environment strategy

Separate at least three environments:

- Local development.
- Staging / pre-production.
- Production.

Keep release/tag operations explicit between environments.

## Build artifacts and generated outputs

Generated files and build outputs should be reproducible and treated as artifacts.

General guideline:

- Do not manually edit generated route artifacts.
- Re-generate from source pages/layouts.
- Keep generated/build directories excluded from source control where appropriate.

## Release process guidance

1. Ensure changes pass tests.
2. Build and verify outputs.
3. Bump tag with CLI command.
4. Push tag and publish release notes.
5. Run smoke checks in staging/production.

## Domain and docs rollout map

Planned target domains:

- `framework.dex.systems` for framework landing and product pages.
- `framework.dex.systems/docs` for public documentation.
- `tool.dex.systems` for tools.
- `dex.systems` for company-level pages.

## Reliability checklist

- Verify API endpoints and health routes.
- Verify asset serving and cache behavior.
- Verify SPA fallback behavior for deep links.
- Verify route generation is up to date.
- Verify rollback path exists for releases.

## Security checklist

- Validate template safety rules in CI.
- Validate dependencies and lockfile hygiene.
- Review release tags and source provenance.
- Simulate malicious template cases in QA.

## Observability basics

At minimum, track:

- Request logs and error rates.
- Deployment timestamps and release tags.
- Build and generation failures.
- Startup and health-check results.
