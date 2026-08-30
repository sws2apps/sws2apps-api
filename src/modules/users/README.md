# Users module

This module owns authenticated user operations under `/api/v3/users`, including
profile validation, MFA settings, sessions, congregation membership, applications,
reports, backups, updates, feedback, and account deletion.

All routes require an authenticated session. Backup metadata and session identifiers
are validated as non-empty strings at the route boundary.

The controller is a thin HTTP layer: routes validate input, and handlers delegate
use cases to services (`users-account.service`, `users-backup.service`,
`users-congregation-activity.service`, `user-lifecycle.service`) and map their
outcomes and typed errors to HTTP responses.
