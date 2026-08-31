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
