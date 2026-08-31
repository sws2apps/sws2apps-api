# Platform administration module

This module owns global administration endpoints under `/api/v3/admin`.

Every route requires an authenticated session and the global administrator role.
The module manages client-version enforcement, congregations, users, sessions, and
feature flags.

Feature-flag availability and coverage are validated at the route boundary.
Feature-flag and API-setting endpoints have dedicated controllers and services;
user and congregation workflows remain grouped in the primary administration
controller until their next behavior-preserving decomposition.
