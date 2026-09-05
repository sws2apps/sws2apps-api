# ADR 0001: Feature-oriented architecture

- Status: Accepted
- Date: 2026-08-28

## Implementation status

Completed on 2026-09-05. The legacy `src/v3` tree has been removed, and the feature
modules and dependency boundaries described by this decision are now established.

## Context

The current API groups most code by technical role. As the API grows, a single
change often requires navigating unrelated route, controller, service, class, and
definition directories. Security boundaries and feature ownership are difficult to
see from the tree.

## Decision

Organize business code by feature. Inside each feature, separate HTTP translation,
business services, validation schemas, persistence repositories, and types. Keep
external-system adapters in `platform` and domain-neutral HTTP concerns in `http`.

Migrate incrementally while keeping `/api/v3` compatible.

## Consequences

Feature behavior becomes easier to locate, review, test, and describe to automated
tools. Dependency rules become explicit. During implementation, the old and new
layouts temporarily coexisted and required discipline to prevent new dependencies
on legacy internals.
