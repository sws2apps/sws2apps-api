# Public API module

This module owns endpoints that do not require an authenticated user session:

- `GET /api/v3/public/stats`
- `GET /api/v3/public/feature-flags`

The feature-flag endpoint accepts installation and user identifiers through
headers. Although the endpoint is public, both values are untrusted input and are
validated at the route boundary.

The controller delegates feature-flag evaluation to
`feature-flags/feature-flag-rollout.service`. This module retains only the public
statistics use case and HTTP transport for the two endpoints.
