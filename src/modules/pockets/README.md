# Pocket module

This module owns the lightweight Pocket-user API under `/api/v3/pockets`.

Invitation signup is public. All subsequent endpoints require a signed Pocket
session cookie. The module handles account validation, backups, sessions, field
service reports, applications, and account deletion.

Legacy user and congregation collections remain temporary dependencies until their
persistence operations are migrated behind repositories.
