# Per-file serialized persistence for storage blobs

Status: Proposal (not yet implemented)
Author: rhahao
Date: 2026-09-06

## Problem statement

Every repository writes its authoritative blob to Firebase Storage with the same
`read -> transform -> write -> publish` shape, and none of these writes are
serialized to the *same file*. Two concurrent requests can both read storage,
both compute a new state from the same snapshot, and both write — the last writer
wins and silently drops the first change. This is the same interleaving hazard
that motivated the in-memory lock in `registerInstallation`, except that the
per-registration lock only defends `installations.txt`.

Affected write sites (all call `uploadFileToStorage`):

| Repository | Blob path (type) | Writes |
|---|---|---|
| `users/repositories/user-account.repository.ts` | `users/<id>/…` | profile, settings, sessions, flags |
| `users/repositories/user-activity.repository.ts` | `users/<id>/…` | persons/reports |
| `congregations/repositories/congregation-*.repository.ts` | `congregations/<id>/…` | settings, join requests, applications, data |
| `installations/installations.repository.ts` | `api/installations.txt` | single blob |
| `feature-flags/feature-flags.repository.ts` | `api/flags.txt` | single blob |

The two `api/*.txt` blobs are the cleanest, highest-value targets (fully
serialized, one file each). The per-user and per-congregation paths are more
numerous but the same principle applies per concrete file path.

## Goals

1. Serialize all writes to the same storage file so each write is based on the
   latest successfully persisted content — no lost updates.
2. Keep the change local to the persistence layer: repositories keep taking a
   fully-formed dataset and returning the persisted result.
3. Preserve current failure semantics: a write still rejects its own caller on
   failure and no partial state is published.
4. No behavior change to the public HTTP contract.

## Why a queue (basic idea)

A **promise-chain queue keyed by the destination file path** guarantees that a
write to a file begins only after the previous write to that file has settled.
Two concurrent updates to the same file are therefore ordered: each subsequent
write observes the effect of the one before it.

This is deliberately *per file*, not global, so writes to different files
(`user A` vs `user B`) still proceed concurrently and don't serialize the whole
application.

### Key design note: what the queue must cover

The queue is only correct if the **read that produced the new content also runs
inside the queue slot** (or is verifiably derived from the previous write). If a
caller reads storage outside the slot, computes a diff, then enqueues only the
write, two such callers can still read the same stale content concurrently.

So the unit of serialization must be `read-and-write` for the file, not `write`
alone. Today repositories and their callers are split: some read at initialization
and write later. This is the main design tension to resolve (see Trade-offs).

## Two candidate designs

### Option A — Per-path write queue in the storage adapter (recommended)

Add a path-keyed serializer next to `uploadFileToStorage` that also supports a
**read-modify-write** callback so the read is inside the slot.

```ts
// platform/firebase/storage.ts (conceptual)
const queues = new Map<string, Promise<unknown>>();

async function withFileLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(path) ?? Promise.resolve();
  let release!: () => void;
  queues.set(path, new Promise((r) => (release = r)));
  try {
    await prev;
    return await fn();
  } finally {
    release();
  }
}

export async function readModifyWriteFile(
  path: string,
  modify: (current: string | undefined) => Promise<string>,
): Promise<string> {
  return withFileLock(path, async () => {
    const current = await getFileFromStorage(path);
    const next = await modify(current);
    await uploadFileToStorage(next, path);
    return next;
  });
}
```

Repositories then express persistence as "transform the current blob and write",
and callers that need the in-memory cache updated call this and publish from the
returned value. This centralizes the ordering guarantee in one adapter.

### Option B — Queue in each repository

Wrap each repository's `saveX` with its own promise chain keyed on its blob path
and require callers to pass the freshly-loaded content. Less adapter churn but
duplicates the queue logic in ~7 repositories and still doesn't put the read
inside the slot unless the callers cooperate.

**Recommendation: Option A.** One adapter owns the invariant; repositories stay
thin and share it.

## Trade-offs and open questions

1. **Where does the read live?** Option A forces a read-modify-write shape that
   some call sites don't currently follow (they load state once at startup into a
   cache, mutate in memory, then persist). Those flows need either (a) the cache
   to be the source of truth written whole inside the slot, or (b) a re-read +
   merge inside the slot. Deciding the source-of-truth per blob is the main
   design work.

2. **Retention/cleanup logic** (e.g., `loadInstallations`, `loadFeatureFlags`
   purge entries older than 3 months) currently runs at load. If reads now happen
   per-write inside a slot, that cleanup must be idempotent and cheap, or moved.

3. **Cross-file atomicity is out of scope.** A queue serializes *one* file. It
   does not give ACID across multiple files (e.g., a user + congregation blob).
   That's a separate, much larger problem (ledger/journaling) and not needed to
   fix the lost-update bug.

4. **Failure semantics.** If the transform or write throws inside the slot, the
   queue still releases (via `finally`) so the file isn't permanently wedged; the
   caller's rejection propagates. No partial publish.

5. **Memory growth.** The `queues` map grows with distinct file paths. Add a cap
   / eviction for long-lived files, or key by a bounded set of well-known paths.

6. **Relationship to the existing `registerInstallation` lock.** The adapter queue
   is complementary: the in-memory `InstallationsList` lock stays, because publish
   to memory must still be atomic with the write. The queue is the *persistence*
   ordering guarantee; the lock is the *in-memory publish* guarantee.

## Rollout plan (if approved)

1. Add `readModifyWriteFile` (Option A) to the storage adapter with unit tests
   (ordering under concurrent callers, failure releases the lock).
2. Port the highest-value, fully-serialized blobs first: `api/installations.txt`
   and `api/flags.txt`; keep the `registerInstallation` memory lock.
3. Assess per-user / per-congregation disks in a follow-up (decision on
   source-of-truth per blob).
4. Full `npm run build`, `npm run lint`, `npm test`; run `npm run test:firebase`
   for the storage integration paths.

Not started — pending review. No code is attached to this proposal yet.
