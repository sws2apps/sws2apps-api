# Field-service meeting synchronization

All authenticated congregation members can download all groups and meetings while
congregation synchronization is enabled. Edit rights never control visibility.

The API reads current server membership for every write. Administrators (including
coordinator/secretary), service overseers and `field_service_schedule` can edit all
meetings. Group overseers and assistants require a current group-overseer role plus
an administrator/service-overseer-maintained scope identifying their person UID.
They can edit only regular meetings for their assigned groups and must select an
eligible conductor from that group. The broad scheduling toggle cannot manage scopes
or obtain a congregation master key.

Recurring group meeting times in congregation settings follow the same rights:
all-group schedulers may change every row, and group schedulers only the rows of
groups the stored scope assigns to them. Other settings in the same upload still
require the existing settings-editor roles.

Clients automatically derive the scope from group responsibilities and conductor
qualifications. Only the scope's opaque IDs and the meeting's authorization envelope
are server-readable. Meeting details remain encrypted with the congregation access
code. An optional HMAC-SHA256 content fingerprint, keyed by that access code,
distinguishes edits from randomized re-encryption retries even when timestamps
match. Clients without a fingerprint are acknowledged as retries only when their
ciphertext is identical; otherwise the normal revision check applies.
Clients override encrypted duplicates of group/category/conductor/deletion
with the validated envelope after decryption. Server scope IDs are not manually
configured in an additional UI.

Updates validate both stored ownership and target ownership, including moves and
tombstones. Records merge by meeting UID; omitting another group's record never
deletes it. Opaque per-record revisions reject stale updates. Scope replacements
also require their last accepted revision. Storage generation preconditions retry
competing writes across API instances and re-run authorization against the latest
scope. Rights are resolved again on each attempt. Meeting merges index stored IDs
once rather than scanning the meeting list for every uploaded row. Revision strings
are also stored atomically as object metadata, so unchanged backup requests do not
download the full meeting document merely to compare revisions.

Authorization reuses the shared user capabilities. Backup services also recheck
current membership and synchronization availability on every storage attempt.
A membership change to another congregation rejects the pending write with the
existing `FIELD_SERVICE_FORBIDDEN` response instead of retargeting its data.

Successful uploads return per-record receipts only after persistence completes.
The app advances the accepted base revision while preserving edits made during the
upload. Ordinary backup datasets use their existing independent persistence flow;
a later meeting conflict does not roll back those datasets. They can be retried
idempotently while the meeting conflict stays pending. A genuinely conflicting offline edit stays pending and produces a conflict
instead of silently replacing a newer server record.

Deploy the API support before the matching app. Existing encrypted local backups
remain importable; the API accepts only the new validated meeting wire format.
An administrator or service overseer must synchronize the derived group scope before
group-only scheduling can be accepted. No new IndexedDB tables or indexes are needed.
