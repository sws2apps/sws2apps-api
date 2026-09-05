---
name: release-readiness
description: Audit sws2apps-api before a push, deployment, or release by checking repository state, verification suites, OpenAPI coverage, CI gates, and deployment prerequisites. Use when asked whether the API is ready to ship; do not trigger a push, deployment, tag, or release as part of the audit.
---

# Release readiness

Produce an evidence-based release decision for the current repository state. Treat
the audit as read-only unless the user separately asks to fix a discovered issue.

## Inspect the candidate

- Read `AGENTS.md` and identify the branch, current commit, upstream relationship,
  staged changes, unstaged changes, and untracked files.
- Review the commits and diff that make up the candidate. Preserve unrelated user
  changes and never print `.env` values, credentials, tokens, or secret contents.
- Confirm that public route changes are represented in
  `docs/openapi/openapi.json` and that the Swagger endpoint still serves the local
  contract.
- Inspect `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`. CI must
  cover build, lint, standard tests, and Firebase integration tests, and deployment
  must remain gated by the reusable CI workflow.

If remote branch or workflow status is relevant, use authenticated read-only tooling
when available. Clearly distinguish remote evidence from local inspection. Do not
assume a GitHub secret or Koyeb variable exists merely because its name appears in a
workflow.

## Run release checks

Run the checks against the exact candidate:

```sh
npm run build
npm run lint
npm test
npm run test:firebase
```

The Firebase suite must use the local `organized-local` emulators and requires Java
21. Never redirect integration tests to a remote Firebase project. Record pass,
failure, and skip counts rather than reporting only that a command completed.

Use `git diff --check` and re-check repository status after verification so generated
artifacts do not enter the candidate unexpectedly.

## Decide and report

Classify the candidate as:

- **Ready**: all required local checks pass, contract and workflow gates agree, and
  no unresolved repository-state issue would alter the release.
- **Blocked**: a required check fails or a concrete contract, security, or workflow
  issue must be fixed first.
- **Conditionally ready**: local checks pass but a remote fact, credential,
  environment approval, or CI result cannot be verified locally.

Lead with the classification and cite the exact evidence. List only actionable
remaining steps and separate local readiness from remote deployment availability.

Do not stage, commit, push, create tags or releases, invoke deployment workflows, or
redeploy Koyeb unless the user explicitly authorizes that action. A request to audit
readiness does not authorize shipping the candidate.
