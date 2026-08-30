# Congregations module

This module owns congregation discovery, congregation creation, and membership
application management under `/api/v3/congregations`.

All routes require an authenticated session. Request bodies are validated at the
route boundary, and controllers delegate persistence and domain workflows to
services.

`Congregation` retains persistence-oriented record operations. Creation,
applications, members, join requests, outgoing-speaker access, lifecycle, and
security-sensitive settings are service-owned. `CongregationsList` is the startup
cache and lookup index; it does not create or delete congregations.

Administrative and meeting-editor congregation endpoints remain separate modules
because they have different permission boundaries.
