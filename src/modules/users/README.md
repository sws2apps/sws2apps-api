# Users module

This module owns authenticated user operations under `/api/v3/users`, including
profile validation, MFA settings, sessions, congregation membership, applications,
reports, backups, updates, feedback, and account deletion.

All routes require an authenticated session. Backup metadata and session identifiers
are validated as non-empty strings at the route boundary.

The controller remains large during this structural migration. Its use cases should
be extracted into services incrementally, with characterization tests added before
each behavioral change.
