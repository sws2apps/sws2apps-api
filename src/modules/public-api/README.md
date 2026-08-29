# Public API module

This module owns endpoints that do not require an authenticated user session:

- `GET /api/v3/public/stats`
- `GET /api/v3/public/feature-flags`

The feature-flag endpoint accepts an installation identifier and an optional user
identifier through headers. Although the endpoint is public, both values are
untrusted input and must be validated before use.

During the incremental architecture migration, this module still reads the shared
in-memory singleton collections (`UsersList`, `CongregationsList`, `Flags`,
`InstallationsList`). Those cross-feature reads should move behind service contracts
once the aggregation behavior has characterization coverage.
