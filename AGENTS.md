# Repository guidance

## Purpose

This repository provides the versioned HTTP API for sws2apps applications. Preserve
the public `/api/v3` contract unless a change is explicitly documented as breaking.

## Architecture

New code follows this dependency direction:

`routes -> controllers -> services -> repositories -> platform adapters`

- Routes declare paths, validation, authentication, and authorization.
- Controllers translate HTTP input and output. Keep business rules out of them.
- Services implement business use cases and must not depend on Express types.
- Repositories own persistence queries. Firebase access must not leak into routes or
  controllers.
- Platform adapters wrap external systems such as Firebase, email, logging, and
  third-party APIs.
- Shared code must be domain-neutral. Do not use `shared` as a miscellaneous folder.

Existing `src/v3` code is migrated incrementally. Do not perform mechanical moves
that mix structural changes with behavior changes.

## Security

- Treat headers, parameters, query strings, cookies, and request bodies as untrusted.
- Validate configuration once during startup and never provide production secret
  fallbacks.
- Never log credentials, cookies, authorization headers, encryption keys, access
  codes, backup contents, or personal data.
- Authentication proves identity; authorization separately checks permission for the
  requested resource.
- Return stable public error codes and keep internal error details in server logs.
- Use constant-time comparisons for security-sensitive values where applicable.

## Verification

Run these checks for source changes:

```sh
npm run build
npm run lint
```

When tests are introduced, add focused tests for changed behavior and run the
relevant suite before the full suite.

