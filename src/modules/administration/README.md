# Platform administration module

This module owns global administration endpoints under `/api/v3/admin`.

Every route requires an authenticated session and the global administrator role.
The module manages client-version enforcement, congregations, users, sessions, and
feature flags.

Feature-flag availability and coverage are validated at the route boundary.
Session, user, congregation, feature-flag, and API-setting endpoints each have
dedicated controllers and services.

## Layout

- `controllers/` translates global administration HTTP requests and responses.
- `services/` coordinates administration use cases.
- `repositories/` owns persisted administration settings.
- Root files expose routes, public exports, and route-specific validation.
