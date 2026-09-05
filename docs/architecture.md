# API architecture

## Current structure

The feature-oriented migration from the former `src/v3` tree is complete. Version 3
keeps its existing HTTP and persistence contracts while application code is grouped
by business capability.

The source layout is:

```text
src/
  app.ts
  index.ts
  bootstrap/
  config/
  domain/
  http/
    middleware/
    security/
  modules/
    administration/
    auth/
    backups/
    congregation-administration/
    congregations/
    feature-flags/
    installations/
    meetings/
    mfa/
    pockets/
    public-api/
    users/
  platform/
    congregation-directory/
    countries/
    email/
    encryption/
    firebase/
    localization/
    logging/
    runtime/
    security/
    visitor-details/
  types/
```

## Dependency rules

Feature modules expose business contracts through `index.ts` and HTTP routers through
`routes.ts`. They own their controllers, services, repositories, validation, and
types. A feature must not import another feature's controller or repository;
cross-feature behavior goes through an exported service contract.

Application imports use the native Node.js subpath aliases `#config`, `#domain`,
`#http`, `#modules`, and `#platform`. Relative imports are reserved for files inside
the same architectural boundary.

Express objects end at the controller boundary. Firebase objects end at repository
or platform boundaries. This makes business behavior independently testable and
keeps infrastructure replacement localized.

ESLint enforces established boundaries: controllers cannot import repositories,
Firebase packages, or platform adapters; services cannot import Express; and cache
models cannot import services, repositories, or platform adapters.

## Change process

1. Characterize existing behavior before changing a public workflow.
2. Keep direct Firebase calls inside repository and platform boundaries.
3. Add focused tests for changed behavior.
4. Run build, lint, and the full test suite before committing.
5. Keep structural and behavioral changes separate whenever practical.

## API compatibility

Version 3 remains mounted at `/api/v3`. Compatibility includes response envelopes,
HTTP status codes, required headers, cookie behavior, validation semantics, and
stored document shapes. Intentional changes require an architecture decision record
and an explicit migration plan.
