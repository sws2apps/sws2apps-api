# Authentication module

This module owns login and passwordless authentication endpoints mounted directly
under `/api/v3`:

- `GET /user-login`
- `POST /user-passwordless-login`
- `POST /user-passwordless-verify`
- `POST /verify-email-token`

Routes validate credentials at the HTTP boundary. The controller translates HTTP
input and manages the signed session cookie. Authentication services own identity
verification, passwordless sign-in, notifications, and authenticated-user results.
Session creation and refresh are isolated from login orchestration, while response
projection owns the client-facing authenticated-user shape.
