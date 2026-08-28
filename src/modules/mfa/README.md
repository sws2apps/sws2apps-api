# Multi-factor authentication module

This module owns `POST /api/v3/mfa/verify-token`.

The route requires an authenticated visitor session and a six-digit TOTP token. A
token is accepted for the current 30-second time step or either adjacent time step.
Successful verification marks the current session as MFA-verified and returns the
existing authenticated-user response.

The module temporarily depends on legacy user and congregation collections. These
dependencies should move behind MFA service interfaces as the authentication domain
is migrated.
