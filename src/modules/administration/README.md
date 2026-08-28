# Platform administration module

This module owns global administration endpoints under `/api/v3/admin`.

Every route requires an authenticated session and the global administrator role.
The module manages client-version enforcement, congregations, users, sessions, and
feature flags.

Feature-flag availability and coverage are validated at the route boundary. The
large controller remains a temporary migration unit and should later be decomposed
into user, congregation, and feature-flag administration services.
