# Feature flags module

This module owns the complete feature-flag lifecycle:

- `feature-flags.service` creates, updates, toggles, and deletes flags.
- `feature-flag-assignments.service` persists user and congregation assignments.
- `feature-flag-rollout.service` evaluates public rollout coverage and coordinates
  automatic assignments.
- `feature-flags.repository` persists the master flag list.
- `Flags` is the in-memory cache and lookup index; `Flag` is a data entity.

Rollout installation IDs and optional user IDs originate from a public endpoint and
must be treated as untrusted even after route validation.
