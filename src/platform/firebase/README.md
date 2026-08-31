# Firebase platform adapter

This directory owns Firebase application initialization and credential parsing.
Feature modules should access Firebase through repositories rather than importing
the Admin SDK or this initialization module directly.

Authentication, document-store, and object-storage adapters expose
application-neutral operations so Firebase SDK records do not leak into feature
modules or bootstrap workflows.

The application imports `firebase-app.ts` once during startup. Local development
uses Firebase emulator environment variables; production may provide a base64
service-account document through `GOOGLE_CONFIG_BASE64`.
