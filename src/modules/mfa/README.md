# Multi-factor authentication module

This module owns `POST /api/v3/mfa/verify-token`.

The route requires an authenticated visitor session and a six-digit TOTP token. A
token is accepted for the current 30-second time step or either adjacent time step.
Successful verification marks the current session as MFA-verified and returns the
existing authenticated-user response.

The controller translates the authenticated HTTP request. MFA services validate the
token, update the user's session, and assemble the authenticated-user result.
