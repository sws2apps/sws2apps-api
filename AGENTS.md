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
integration behavior and the emulators are available.

## Change workflow

- Keep each implementation chunk coherent and independently reviewable.
- Stage only the files belonging to that chunk.
- Provide a scoped Conventional Commit message after verification.
- Do not include unrelated user changes in a commit.

