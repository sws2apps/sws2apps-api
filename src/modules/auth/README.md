# Authentication module

This module owns login and passwordless authentication endpoints mounted directly
under `/api/v3`:

- `GET /user-login`
- `POST /user-passwordless-login`
- `POST /user-passwordless-verify`
- `POST /verify-email-token`

Routes validate credentials at the HTTP boundary. The controller manages Firebase
identity verification, signed session cookies, passwordless email delivery, and the
existing authenticated-user response.

The controller temporarily depends on legacy user and congregation collections.
Those dependencies should move behind authentication services and repositories in
smaller, behavior-tested chunks.
