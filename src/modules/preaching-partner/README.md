# Preaching partner requests

Routes authenticate Organized and Pocket sessions using the existing middleware.
Services derive the publisher identity from the user's current congregation membership;
clients cannot assign owners or partners. Congregation data sync must be enabled.
The linked publisher ID is authoritative; encrypted person demographic records are
not decrypted by this module.

The repository persists one encrypted congregation file through the Firebase storage
adapter. Generation preconditions protect read/modify/write across API processes.
A join and its explicitly selected same-day withdrawals are committed together.
All mutations except creation compare the last observed server revision. Conflicts
return `PARTNER_CONFLICT` (409); clients must refresh instead of overwriting it.

POST uses a UUID operation ID. Retry an uncertain network result with the exact same
payload and ID. The last 2,000 operation receipts are retained per congregation;
older retries still face revision and request-ID checks. GET returns a full snapshot,
including deletion tombstones, so offline caches can reconcile removals. The store
rejects creation after 10,000 requests instead of silently dropping history.

Routes, request bounds, stable errors, and response shapes are documented in OpenAPI.
The API stores data with the existing server-side encryption adapter; it does not
provide a separate client end-to-end encryption protocol.

Deployment must precede client enablement. Local pending edits must retain operation
IDs and original server revisions. A client must only report an arrangement confirmed
after a successful server response; offline browsing must not imply reservation.

Every mutation carries the expected `publisher_uid`; it must match the authenticated
membership. GET and POST responses echo that identity. This prevents a Pocket cookie
changed in another tab from replaying one publisher's local queue as another publisher.
The client scopes its durable cache and queue by API, congregation, user and publisher,
retains failed drafts for review, and confirms joins/cancellations only after acceptance.
