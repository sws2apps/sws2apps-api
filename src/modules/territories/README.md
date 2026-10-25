# Territory backend contract

Territories use Organized's authenticated `/api/v3` API, existing congregation membership, Firebase Storage and encryption adapters. There is no pairing service or separate identity system. Routes/controllers handle HTTP; services enforce policy; repositories own persistence.

## Identity and permission projection

Never use a display name as identity. Assignments, requests and group scope use stable person/group IDs. Migration from legacy name-based assignments must resolve unique matches in the authorized client; ambiguous records require manager review and cannot grant access.

Managers are admins, coordinators, secretaries, service overseers and elders, matching the current territory editor policy. Only managers may publish the permission projection. The server verifies projected person IDs exist in congregation records. The projection contains eligibility, permitted data views, group leadership IDs and category/type restrictions. Names, maps, notes, do-not-call details and settings remain client encrypted. The server cannot derive disqualification or group leadership from existing encrypted person/group fields: manager clients must refresh the projection when these change. Missing grants deny publisher operations. Group IDs in a grant mean leadership scope, not ordinary group membership.

Campaign assignments reference `event_uid` in existing Upcoming Events; no duplicate campaign entity is created. Existence is checked, but the encrypted event category, date and deletion state must be validated by the manager client. Assignment notes are separate from permanent territory content and are visible only to the original publisher or managers after return.

## Writes and conflicts

`PUT /congregations/:id/territories/policy` accepts the expected policy revision. `POST /congregations/:id/territories/:territoryId/commands` accepts an operation and expected record revision. The server owns all revisions and timestamps. No generic replacement of an assignment/history is allowed. Returned records preserve history; deletion retains a tombstone and cannot resurrect the identifier.

`POST /congregations/:id/territories/commands` applies up to 20 manager update/delete operations atomically for splits/combinations. It checks both the overall snapshot revision and individual record revisions. Assigned/requested source records cannot be deleted. Geometry remains encrypted and must be validated in the client before submission.

The repository stores one encrypted aggregate at `v3/congregations/<id>/territories/main.txt`, following existing congregation datasets. Generation-pinned reads and conditional writes prevent lost updates across server processes. A concurrent mutation, including a policy change, returns `409 TERRITORY_CONFLICT`. Clients fetch current state and reconcile explicitly; repeating a stale command never creates a second assignment. Writes are capped at 10,000 records and 16 MiB of serialized state. This bounded aggregate trades whole-file writes for simple atomic policy and multi-record operations; benchmark representative congregation data before rollout. Large image/PDF attachments do not belong in this payload.

## Existing backup transport

Include a `territories` string key in the existing backup metadata header to opt into `territories_snapshot`. A complete authorized snapshot is returned, even when the supplied revision matches, because account roles can change independently of data. Old clients do not request or receive this field. `GET /congregations/:id/territories` exposes the same snapshot.

Clients replace their authorized visible set, removing records absent from the snapshot after assignment, revocation or deletion; merge-only processing would retain unauthorized data. Disable/clear remote territory access when congregation data sync is disabled or account membership is removed. Offline clients cannot be remotely wiped: cached data follows Organized's existing device protection model.

Backup uploads cannot replace territory state; `territories` and `territories_snapshot` are rejected. Writes must use revision-checked commands. Managers can migrate historical assignments through the revision-checked `reconcile` command. It validates dates, stable identities, active assignment eligibility and group scope. Publishers cannot use it. The congregation's existing prefix deletion removes territory storage too.

## Frontend integration contract

Frontend records use a distinct local format. The integration must migrate stable IDs, encrypt each disclosure scope, project manager permissions, persist an operation queue and apply complete authorized snapshots. Pending offline requests/returns must be distinguished from server-confirmed operations. Never put other publishers' notes in the shared `content` envelope; use the separate private content and assignment-note fields. The backend does not decrypt or inspect opaque payloads.

`assignment_note` edits the active assignment note for its publisher or a manager. `return` preserves an existing note if no replacement is supplied. `do_not_call` adds/updates an encrypted entry with server-owned authorship; omitting its content deletes it. A publisher must currently hold the territory and may edit only entries they authored. Managers can edit all entries. The separate `doNotCalls` collection is returned only to current holders and managers, never to general territory viewers.

## Verification boundary

The Firebase Storage emulator in pinned CLI 15.29.0 ignores `ifGenerationMatch` and generation-specific downloads. Emulator tests cover encrypted storage round trips, not production CAS semantics. SDK-boundary tests verify exact generation preconditions, pinned downloads, retries and 412 conflict handling; workflow tests verify only one successful assignment against a conditional-write store. A concurrency test against an isolated real GCS test bucket is still required before production rollout. Do not use production congregation data for that check. GCS documents these preconditions at https://cloud.google.com/storage/docs/request-preconditions.

`POST /commands` accepts up to 20 commands atomically, including successive revisions of one record. `operationId` stores the last 256 account-bound payload receipts; an identical retry acknowledges the original commit without applying it again. Persist the exact encrypted payload before sending it. An expired receipt produces a revision conflict rather than guessing whether to replay. Pocket accounts use their existing signed visitor session; VIP accounts still require bearer identity and completed MFA.
