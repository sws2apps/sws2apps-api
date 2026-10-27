import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeFieldServiceUpload } from '#modules/field-service-meetings/policy.js';
import { hasValidFieldServiceBackup } from '#modules/field-service-meetings/index.js';
import { FieldServiceWriteError, type FieldServiceDocument, type FieldServiceMeetingRecord, type SchedulingActor } from '#modules/field-service-meetings/index.js';
import { parseBackupPayload } from '#modules/backups/index.js';

const actor = (personUid = 'lead', roles: SchedulingActor['roles'] = ['group_overseers']): SchedulingActor => ({ congregationId: 'cong', personUid, roles });
const record = (uid = 'meeting-a', group_id = 'group-a'): FieldServiceMeetingRecord => ({
	meeting_uid: uid,
	content_hash: 'a'.repeat(64),
	authorization: { group_id, category: 0, conductor: `conductor-${group_id}`, deleted: false, updatedAt: '2026-10-26T08:00:00.000Z' },
	meeting_data: 'encrypted-content',
});
const document = (): FieldServiceDocument => ({
	scope_revision: 'scope-1', meetings_revision: '', meetings: [],
	scope: [
		{ group_id: 'group-a', manager_uids: ['lead', 'assistant'], conductor_uids: ['conductor-group-a'] },
		{ group_id: 'group-b', manager_uids: ['other'], conductor_uids: ['conductor-group-b'] },
	],
});
const changed = (meeting: FieldServiceMeetingRecord) => ({ ...structuredClone(meeting), authorization: { ...meeting.authorization, updatedAt: '2026-10-26T09:00:00.000Z' } });
const denied = (run: () => unknown, code: FieldServiceWriteError['code'] = 'FORBIDDEN') => assert.throws(run, (error: unknown) => error instanceof FieldServiceWriteError && error.code === code);

describe('field service server authorization', () => {
	for (const role of ['admin', 'coordinator', 'secretary', 'service_overseer', 'field_service_schedule'] as const) {
		it(`${role} edits all groups, joint meetings and visits`, () => {
			for (const category of [0, 2, 3] as const) {
				const meeting = record('meeting', 'group-b');
				meeting.authorization.category = category;
				assert.equal(mergeFieldServiceUpload(document(), actor('unrelated', [role]), [meeting]).meetings.length, 1);
			}
		});
	}
	for (const person of ['lead', 'assistant']) {
		it(`${person} creates, edits and deletes only an owned regular meeting`, () => {
			const first = mergeFieldServiceUpload(document(), actor(person), [record()], undefined, () => 'r1');
			const edit = changed(first.meetings[0]);
			const second = mergeFieldServiceUpload(first, actor(person), [edit], undefined, () => 'r2');
			const deletion = changed(second.meetings[0]);
			deletion.authorization.updatedAt = '2026-10-26T10:00:00.000Z';
			deletion.authorization.deleted = true;
			assert.equal(mergeFieldServiceUpload(second, actor(person), [deletion]).meetings[0].authorization.deleted, true);
			denied(() => mergeFieldServiceUpload(document(), actor(person), [record('other', 'group-b')]));
		});
	}
	for (const category of [2, 3] as const) {
		it(`group managers cannot create category ${category}`, () => {
			const meeting = record(); meeting.authorization.category = category;
			denied(() => mergeFieldServiceUpload(document(), actor(), [meeting]));
		});
	}
	it('membership, report delegation and forged local roles do not grant editing', () => {
		denied(() => mergeFieldServiceUpload(document(), actor('publisher', ['publisher']), [record()]));
		denied(() => mergeFieldServiceUpload(document(), actor('delegate', ['group_overseers']), [record()]));
		denied(() => mergeFieldServiceUpload(document(), actor('lead', ['publisher']), [record()]));
	});
	it('supports the existing field-service group-overseer role only within its trusted scope', () => {
		const manager = actor('lead', ['field_service_group_overseer']);
		assert.equal(mergeFieldServiceUpload(document(), manager, [record()]).meetings.length, 1);
		denied(() => mergeFieldServiceUpload(document(), manager, [record('other', 'group-b')]));
	});
	it('checks the stored group before accepting a forged move or deletion', () => {
		const current = document(); current.meetings = [{ ...record('victim', 'group-b'), revision: 'r1' }];
		const forged = changed(current.meetings[0]); forged.authorization.group_id = 'group-a';
		forged.authorization.conductor = 'conductor-group-a';
		denied(() => mergeFieldServiceUpload(current, actor(), [forged]));
		forged.authorization.deleted = true;
		denied(() => mergeFieldServiceUpload(current, actor(), [forged]));
	});
	it('checks the target group when moving an owned meeting', () => {
		const current = document(); current.meetings = [{ ...record(), revision: 'r1' }];
		const move = changed(current.meetings[0]); move.authorization.group_id = 'group-b';
		denied(() => mergeFieldServiceUpload(current, actor(), [move]));
	});
	it('requires a qualified conductor from the same group', () => {
		for (const conductor of ['unqualified', 'conductor-group-b']) {
			const meeting = record(); meeting.authorization.conductor = conductor;
			denied(() => mergeFieldServiceUpload(document(), actor(), [meeting]));
		}
	});
	it('permits deleting a meeting after its conductor becomes ineligible', () => {
		const current = document(); current.meetings = [{ ...record(), revision: 'r1' }]; current.scope[0].conductor_uids = [];
		const deletion = changed(current.meetings[0]); deletion.authorization.deleted = true;
		assert.equal(mergeFieldServiceUpload(current, actor(), [deletion]).meetings[0].authorization.deleted, true);
	});
	it('revoking the role or manager scope immediately blocks queued edits', () => {
		const current = document(); current.scope[0].manager_uids = [];
		denied(() => mergeFieldServiceUpload(current, actor(), [record()]));
		denied(() => mergeFieldServiceUpload(document(), actor('lead', []), [record()]));
	});
	it('the separate scheduling toggle does not grant scope-administration rights', () => {
		denied(() => mergeFieldServiceUpload(document(), actor('lead', ['field_service_schedule']), [], { base_revision: 'scope-1', groups: [] }));
	});
	it('only trusted group managers may synchronize scopes and stale snapshots conflict', () => {
		const upload = { base_revision: 'scope-1', groups: [] };
		denied(() => mergeFieldServiceUpload(document(), actor(), [], upload));
		assert.equal(mergeFieldServiceUpload(document(), actor('admin', ['admin']), [], upload).scope.length, 0);
		denied(() => mergeFieldServiceUpload(document(), actor('admin', ['admin']), [], { ...upload, base_revision: 'old' }), 'CONFLICT');
	});
	it('accepts unchanged scopes despite ordering and stale revisions', () => {
		const current = document();
		const scope = { base_revision: 'old', groups: current.scope.toReversed() };
		assert.equal(mergeFieldServiceUpload(current, actor('admin', ['admin']), [], scope).scope_revision, 'scope-1');
	});
	it('merges simultaneous meetings independently and retains omitted groups', () => {
		const current = document(); current.meetings = [record('other', 'group-b')];
		const saved = mergeFieldServiceUpload(current, actor(), [record('one'), record('two')]);
		assert.deepEqual(saved.meetings.map((meeting) => meeting.meeting_uid), ['other', 'one', 'two']);
		assert.equal(current.meetings.length, 1);
	});
	it('stale offline edits and tombstones cannot overwrite a newer revision', () => {
		const current = document(); current.meetings = [{ ...record(), revision: 'latest' }];
		const stale = changed(current.meetings[0]); stale.revision = 'old';
		denied(() => mergeFieldServiceUpload(current, actor(), [stale]), 'CONFLICT');
		stale.authorization.deleted = true;
		denied(() => mergeFieldServiceUpload(current, actor(), [stale]), 'CONFLICT');
	});
	it('repeated uploads of unchanged encrypted records retain the revision', () => {
		const current = document(); current.meetings = [{ ...record(), revision: 'r1' }];
		const repeat = structuredClone(current.meetings[0]); repeat.meeting_data = 'reencrypted-same-content';
		assert.equal(mergeFieldServiceUpload(current, actor(), [repeat]).meetings[0].revision, 'r1');
	});
	it('does not acknowledge different content with the same timestamp as an unchanged edit', () => {
		const current = document();
		current.meetings = [{ ...record(), revision: 'r1' }];
		const edit = { ...structuredClone(current.meetings[0]), content_hash: 'b'.repeat(64), meeting_data: 'different-edit' };
		const saved = mergeFieldServiceUpload(current, actor(), [edit], undefined, () => 'r2');
		assert.equal(saved.meetings[0].meeting_data, 'different-edit');
		assert.equal(saved.meetings[0].revision, 'r2');
		denied(() => mergeFieldServiceUpload(saved, actor(), [{ ...edit, content_hash: 'c'.repeat(64) }]), 'CONFLICT');
	});
	it('only treats identical ciphertext as a retry for older records without a content identity', () => {
		const current = document();
		const older = { ...record(), revision: 'r1' };
		delete older.content_hash;
		current.meetings = [older];
		assert.equal(mergeFieldServiceUpload(current, actor(), [older]).meetings[0].revision, 'r1');
		const changed = { ...older, meeting_data: 'new-encryption-or-edit' };
		const saved = mergeFieldServiceUpload(current, actor(), [changed], undefined, () => 'r2');
		assert.equal(saved.meetings[0].meeting_data, changed.meeting_data);
		denied(() => mergeFieldServiceUpload(saved, actor(), [{ ...changed, meeting_data: 'another-edit' }]), 'CONFLICT');
	});
	it('merges a large batch by identity while preserving stored order and omitted records', () => {
		const current = document();
		current.meetings = [{ ...record('stored'), revision: 'r1' }];
		const upload = Array.from({ length: 10_000 }, (_, index) => record(`meeting-${index}`));
		const saved = mergeFieldServiceUpload(current, actor('admin', ['admin']), upload);
		assert.equal(saved.meetings.length, 10_001);
		assert.equal(saved.meetings[0].meeting_uid, 'stored');
		assert.equal(saved.meetings.at(-1)?.meeting_uid, 'meeting-9999');
	});
	it('unchanged authorization is independent of JSON object key order', () => {
		const current = document(); current.meetings = [{ ...record(), revision: 'r1' }];
		const repeat = structuredClone(current.meetings[0]);
		repeat.authorization = Object.fromEntries(Object.entries(repeat.authorization).reverse()) as typeof repeat.authorization;
		assert.equal(mergeFieldServiceUpload(current, actor(), [repeat]).meetings[0].revision, 'r1');
	});
	it('a rejected batch leaves every existing record and scope untouched', () => {
		const current = document(); const before = structuredClone(current);
		denied(() => mergeFieldServiceUpload(current, actor(), [record(), record('other', 'group-b')]));
		assert.deepEqual(current, before);
	});
});

describe('field service wire validation', () => {
	it('accepts an encrypted record and rejects malformed authorization, duplicate IDs and scope forgery shapes', () => {
		assert.equal(hasValidFieldServiceBackup({ field_service_meetings: [record()] }), true);
		for (const meeting of [
			{ ...record(), authorization: undefined },
			{ ...record(), meeting_data: {} },
			{ ...record(), content_hash: 'invalid' },
			{ ...record(), authorization: { ...record().authorization, category: '0' } },
			{ ...record(), authorization: { ...record().authorization, category: 1 } },
			{ ...record(), authorization: { ...record().authorization, updatedAt: 'yesterday' } },
		]) assert.equal(hasValidFieldServiceBackup({ field_service_meetings: [meeting] }), false);
		assert.equal(hasValidFieldServiceBackup({ field_service_meetings: [record(), record()] }), false);
		assert.equal(hasValidFieldServiceBackup({ field_service_scheduling: { base_revision: '', groups: [{ group_id: 'g', manager_uids: 'self', conductor_uids: [] }] } }), false);
		assert.throws(() => parseBackupPayload({ metadata: {}, field_service_meetings: [{ meeting_uid: 'unvalidated' }] }));
	});
});
