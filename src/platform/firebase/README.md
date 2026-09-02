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

## Firestore integration tests

Run `npm run test:firebase` to start an isolated Firestore emulator and exercise
the document-store adapter against it. The Firebase CLI and Java must be available
locally, as they are for the existing emulator commands.

The integration suite requires both an explicit opt-in flag and a localhost
emulator address. This prevents it from writing test records to a remote Firebase
project. The regular `npm test` command discovers the suite but safely skips it.
