# Meetings module

This module owns congregation schedule publishing and visiting-speaker coordination
under `/api/v3/congregations/meeting`.

All routes require an authenticated congregation meeting editor. Visiting-speaker
access routes additionally require the public-talk coordinator role. Keeping those
permission transitions visible in the router is a security invariant.

The controller temporarily uses the legacy congregation collection. Persistence
should move behind a meetings repository after controller behavior is covered.
