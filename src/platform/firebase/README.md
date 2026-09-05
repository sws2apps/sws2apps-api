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

Run `npm run test:firebase` to start isolated Authentication, Firestore, and
Storage emulators and exercise their adapters against them. Java 21 must be
available locally. The npm script downloads the pinned Firebase CLI version, so a
global CLI installation and Firebase login are not required.

The integration suite requires both an explicit opt-in flag and a localhost
emulator address. This prevents it from writing test records to a remote Firebase
project. The regular `npm test` command discovers the suite but safely skips it.
CI runs the integration suite in a separate job and gates production deployment on
its result.
