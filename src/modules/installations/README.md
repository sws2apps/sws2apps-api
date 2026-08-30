# Installations module

This module tracks application installations used by feature-flag rollout.

- `installations.service` owns pending registration, linked registration, and
  pending-to-linked promotion.
- `installations.repository` owns Firebase storage serialization.
- `InstallationsList` is the startup cache and lookup index.

Installation identifiers come from public request headers. Routes validate their
shape, and services must not treat them as authentication credentials.
