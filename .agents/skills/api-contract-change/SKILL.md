---
name: api-contract-change
description: Implement or modify public /api/v3 endpoints in sws2apps-api, including layered code, route security, OpenAPI synchronization, focused tests, verification, and a scoped commit handoff. Use for endpoint additions, removals, or HTTP contract behavior changes; do not use for internal refactors that cannot affect the HTTP contract.
---

# API contract changes

Deliver a complete, reviewable HTTP contract change while preserving existing
`/api/v3` behavior unless the user explicitly authorizes a breaking change.

## Establish the contract

Read `AGENTS.md`, the affected module's README and public entrypoints, the current
route/controller/service/repository flow, relevant tests, and
`docs/openapi/openapi.json` before editing.

Identify the request shape, response shape, public error codes, authentication,
authorization, and compatibility requirements. Ask for direction only when an
unresolved choice would materially change the public contract.

## Implement through the layers

- Register route paths as string literals so the OpenAPI coverage test can derive
  the route inventory.
- Validate all applicable parameters, queries, headers, cookies, and bodies at the
  route boundary with `validateRequest`.
- Apply authentication and resource authorization separately.
- Keep controllers limited to translating Express input, service results, and HTTP
  responses. Use the standard response helpers and keep internal details out of
  public messages.
- Pass plain application data into services; services must not depend on Express
  types.
- Keep persistence operations in repositories and external SDK behavior in platform
  adapters.
- Import another feature's business API through `#modules/<feature>/index.js` and
  its router through the module's `routes.js` entrypoint.

Preserve logging redaction and never add credentials, cookies, authorization
values, backup contents, personal data, or provider error details to logs or public
responses.

## Keep documentation and tests synchronized

Update `docs/openapi/openapi.json` in the same change whenever a public path, method,
input, output, status, error, or security requirement changes. Reuse schemas and
security definitions where they already express the contract.

Add focused service or HTTP tests for new behavior and important rejection paths.
Rely on the OpenAPI completeness test to catch undocumented route or method drift,
but still inspect the operation's documented request, response, and security
details.

## Verify and hand off

Run:

```sh
npm run build
npm run lint
npm test
```

Also run `npm run test:firebase` when the change affects a Firebase adapter or its
integration behavior. Report skipped checks and their reason; do not describe an
unrun check as passing.

After verification, summarize the contract and implementation outcome, list any
remaining risk, and provide exact scoped `git add` and Conventional Commit commands.
Do not commit, push, deploy, or release unless the user explicitly requests that
external action.
