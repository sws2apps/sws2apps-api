# Public API module

This module owns endpoints that do not require an authenticated user session:

- `GET /api/v3/public/stats`
- `GET /api/v3/public/feature-flags`

The feature-flag endpoint accepts an installation identifier through a header.
The header is untrusted input and is validated at the route boundary. User and
congregation scoping is resolved only from the installation's persisted binding;
an unbound or anonymous installation receives application-scoped flags only, so
callers cannot claim another account by sending a user identifier on the public
endpoint.

The controller delegates feature-flag evaluation to
`feature-flags/feature-flag-rollout.service`. This module retains only the public
statistics use case and HTTP transport for the two endpoints.
