# HTTP layer

The HTTP layer assembles Express routes and owns concerns shared across feature
modules: request security, authentication, authorization, compatibility checks,
readiness, error responses, and API composition.

`api-v3.routes.ts` is the complete version 3 route map. Mount order is significant:

1. Signed-cookie parsing
2. Public API routes
3. Trusted browser-origin enforcement
4. Global administration routes
5. Minimum client-version enforcement
6. Authentication, session recovery, and feature routes

Two ordering constraints depend on this sequence. Global administration routes are
mounted before the client-version gate because internal tooling does not send
`appclient` or `appversion`, and the routes that mint the session cookie sit after
the gate, so a client that skips the gate must also be able to reach session
recovery. Reordering these mounts reintroduces the deadlock where a revoked
administrator device cannot reconnect.

The client-version gate only judges callers on the routes mounted after it, and
only for a complete client identification. `appclient` may be sent alone, because
a declared version is required to evaluate the Organized minimum-version rule;
`appversion` sent without `appclient` is rejected as invalid input, because a
version cannot be attributed to any client. Global administration routes are
mounted ahead of the gate and therefore ignore both headers entirely.

Feature business rules do not belong in this directory. Controllers live with their
feature modules, and infrastructure integrations live under `platform`.
