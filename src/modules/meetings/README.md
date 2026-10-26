# Meetings module

This module owns congregation schedule publishing and visiting-speaker coordination
under `/api/v3/congregations/meeting`.

All routes require an authenticated congregation meeting editor. Visiting-speaker
access routes additionally require the public-talk coordinator role. Keeping those
permission transitions visible in the router is a security invariant.

The `duties_schedule` role follows the existing schedule-editor path: congregation
backup synchronization carries encrypted duty settings and assignments, and the
schedule routes publish and retrieve duties alongside other meeting schedules.
Duty configuration remains client-encrypted in `meeting_duties`; the API treats
language-group setups, icons and recurring sections as opaque data. Duty-only
editors do not gain congregation-administration or visiting-speaker access.

The controller is HTTP-only. `meetings.service` owns authorization and use-case
coordination, `schedule-publication` owns public schedule persistence, and
`visiting-speaker-directory` owns discoverable congregation filtering and public
projection. Outgoing-speaker access state remains in the congregations service
boundary because it is shared with user updates and startup synchronization.
