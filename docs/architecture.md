# API architecture

## Migration goals

The API is being migrated from a layer-oriented `src/v3` tree to feature modules.
The migration must preserve routes, payloads, status codes, cookies, authentication
behavior, and Firebase data formats.

The target layout is:

```text
src/
  main.ts
  app.ts
  config/
  http/
    errors/
    middleware/
    responses/
  modules/
    auth/
    users/
    congregations/
    meetings/
    pockets/
    feature-flags/
    installations/
    administration/
  platform/
    authentication/
    database/
    email/
    encryption/
    external-api/
    logging/
    storage/
  shared/
    constants/
    types/
    utilities/
```

## Dependency rules

Feature modules expose a small public API and own their routes, controllers,
services, repositories, schemas, and types. Dependencies point inward from HTTP and
platform concerns toward business services. A feature must not import another
feature's controller or repository; cross-feature behavior goes through an exported
service contract.

Express objects end at the controller boundary. Firebase objects end at repository
or platform boundaries. This makes business behavior independently testable and
keeps infrastructure replacement localized.

ESLint enforces two established boundaries: controllers cannot import repositories,
Firebase packages, or platform adapters, and services cannot import Express.

## Migration process

1. Add shared configuration, HTTP, observability, and test foundations.
2. Characterize the behavior of a route group before moving it.
3. Move one feature at a time without changing its external contract.
4. Replace direct Firebase calls with repository operations.
5. Remove the old files only after build, lint, and behavior checks pass.

Structural and behavioral changes should be separate commits whenever practical.

## API compatibility

Version 3 remains mounted at `/api/v3`. Compatibility includes response envelopes,
HTTP status codes, required headers, cookie behavior, validation semantics, and
stored document shapes. Intentional changes require an architecture decision record
and an explicit migration plan.
