# HTTP layer

The HTTP layer assembles Express routes and owns concerns shared across feature
modules: request security, authentication, authorization, compatibility checks,
readiness, error responses, and API composition.

`api-v3.routes.ts` is the complete version 3 route map. Mount order is significant:

1. Signed-cookie parsing
2. Public API routes
3. Minimum client-version enforcement
4. Authentication and feature routes

Feature business rules do not belong in this directory. Controllers live with their
feature modules, and infrastructure integrations live under `platform`.
