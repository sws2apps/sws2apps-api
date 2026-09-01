# Users module

This module owns authenticated user operations under `/api/v3/users`, including
profile validation, MFA settings, sessions, congregation membership, applications,
reports, backups, updates, feedback, and account deletion.

All routes require an authenticated session. Backup metadata and session identifiers
are validated as non-empty strings at the route boundary.

Account, backup, and congregation-activity HTTP handlers have dedicated
controllers. Routes validate input, and handlers delegate use cases to matching
services and map their outcomes and typed errors to HTTP responses.

`User` retains persistence-oriented state operations. Session projection and
revocation, entity creation, backup application, identity operations, membership,
and lifecycle workflows are service-owned. `UsersList` is the startup cache and
lookup index; it does not create or delete accounts.

Persistence is separated into account, activity-data, metadata, and lifecycle
repositories. Feature modules do not import the Firebase SDK directly.

## Layout

- `controllers/` translates authenticated HTTP requests and responses.
- `services/` owns user workflows and application use cases.
- `repositories/` owns persisted user data.
- `types/` contains the module's shared data contracts.
- Root files expose routes, public exports, the `User` aggregate, and `UsersList` cache.
