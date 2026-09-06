# Repository guidance

## Purpose

This repository provides the versioned HTTP API for sws2apps applications. Preserve
the public `/api/v3` contract unless a change is explicitly documented as breaking.

## Architecture

Code follows this dependency direction:

`routes -> controllers -> services -> repositories -> platform adapters`

- Routes declare paths, validation, authentication, and authorization.
- Controllers translate HTTP input and output. Keep business rules out of them.
- Services implement business use cases and must not depend on Express types.
- Repositories own persistence queries. Firebase access must not leak into routes or
  controllers.
- Platform adapters wrap external systems such as Firebase, email, logging, and
  third-party APIs.
- Shared code must be domain-neutral. Do not use `shared` as a miscellaneous folder.
- Keep startup-only support in `src/bootstrap` and validated runtime settings in
  `src/config`.
- Keep feature-specific types inside their module. Reserve `src/types` for global
  declaration augmentation and genuinely cross-cutting structural types.

Feature modules expose business contracts through `src/modules/<feature>/index.ts`
and their HTTP router through `src/modules/<feature>/routes.ts`. Cross-module
consumers must use the appropriate public entrypoint rather than reaching into a
module's internal files.

Use the native Node.js subpath imports configured in `package.json`:

- `#config/*` for application configuration.
- `#domain/*` for domain-neutral types and rules.
- `#http/*` for HTTP concerns.
- `#modules/*` for feature modules.
- `#platform/*` for external-system adapters.

Keep structural refactors separate from behavior changes unless they form one small,
coherent change that can be reviewed and tested together.

## Code documentation

- Use clear names and TypeScript types as the primary documentation.
- Add JSDoc when it explains security assumptions, business rules, side effects,
  required operation order, stable error behavior, or external-system constraints.
- Do not add comments that merely repeat a function's parameters, return type, or
  implementation.
- Keep OpenAPI focused on the public HTTP contract and module READMEs focused on
  architectural boundaries.

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
npm test
```

Add focused tests for changed behavior and run the relevant suite before the full
suite. Run `npm run test:firebase` when a change affects a Firebase adapter or its
integration behavior. It requires Java 21 and starts isolated local emulators using
the Firebase CLI version pinned in the npm script; it must not use remote Firebase
resources or production credentials.

The CI workflow runs build, lint, standard tests, and Firebase integration tests for
pull requests and pushes to `main`. The production deployment reuses the same CI
workflow and must remain gated by all of its jobs.

- Update `docs/openapi/openapi.json` whenever a public route or HTTP method changes.
- Keep route registration paths as string literals so the OpenAPI completeness test
  can derive the live `/api/v3` route inventory.

## Static analysis quality gates

- Keep SonarCloud quality gates green. Before finishing a change, consider whether it
  introduces `typescript:S3776` (Cognitive Complexity) issues.
- Keep every function's Cognitive Complexity at or below the SonarCloud threshold
  (default 15). Do not exceed it by nesting guards, `&&`/`||` chains, or chained
  `some`/`every`/`find` callbacks that embed further branching.
- When a validation or policy function grows past the threshold, extract each concern
  into a small boolean helper (e.g. `hasValidCongUsers`, `hasValidAppSettings`) and
  compose them with flat early returns so every function stays well under the limit.
- Do not use `// eslint-disable` or SonarQube `@SuppressWarnings` to silence a
  complexity smell; reduce the complexity instead.

## Change workflow

- Keep each implementation chunk coherent and independently reviewable.
- Stage only the files belonging to that chunk.
- Provide a scoped Conventional Commit message after verification.
- Do not include unrelated user changes in a commit.

