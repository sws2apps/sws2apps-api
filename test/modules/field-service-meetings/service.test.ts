import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	FieldServiceWriteError,
	getFieldServiceMeetingReceipts,
	saveFieldServiceMeetings,
	type FieldServiceDocument,
	type FieldServiceMeetingRecord,
	type SchedulingActor,
} from '#modules/field-service-meetings/index.js';

const createDocument = (): FieldServiceDocument => ({
	scope: [{ group_id: 'group', manager_uids: ['assistant'], conductor_uids: ['conductor'] }],
	scope_revision: 'scope-1',
	meetings: [],
	meetings_revision: '',
});

const createMeeting = (): FieldServiceMeetingRecord => ({
	meeting_uid: 'meeting',
	authorization: {
		group_id: 'group',
		category: 0,
		conductor: 'conductor',
		deleted: false,
		updatedAt: '2026-10-26T08:00:00.000Z',
	},
	meeting_data: 'encrypted-content',
});

const isForbidden = (error: unknown): boolean => {
	return error instanceof FieldServiceWriteError && error.code === 'FORBIDDEN';
};

describe('field service meeting persistence authorization', () => {
	it('uses the stable forbidden error if membership moves to another congregation', async () => {
		await assert.rejects(saveFieldServiceMeetings('congregation', () => ({
			congregationId: 'other-congregation',
			roles: ['admin'],
		}), [createMeeting()], undefined, {
			updateDocument: async (_id, modify) => modify(createDocument()),
		}), isForbidden);
	});

	it('rechecks revoked roles when storage retries a competing write', async () => {
		let roles: SchedulingActor['roles'] = ['group_overseers'];
		let attempts = 0;

		await assert.rejects(saveFieldServiceMeetings('congregation', () => ({
			congregationId: 'congregation',
			personUid: 'assistant',
			roles,
		}), [createMeeting()], undefined, {
			updateDocument: async (_id, modify) => {
				modify(createDocument());
				attempts++;
				roles = ['publisher'];
				return modify(createDocument());
			},
		}), isForbidden);
		assert.equal(attempts, 1);
	});

	it('checks the latest group scope on a retried write', async () => {
		const current = createDocument();
		await assert.rejects(saveFieldServiceMeetings('congregation', () => ({
			congregationId: 'congregation',
			personUid: 'assistant',
			roles: ['language_group_overseers'],
		}), [createMeeting()], undefined, {
			updateDocument: async (_id, modify) => {
				modify(current);
				current.scope[0].manager_uids = [];
				return modify(current);
			},
		}), isForbidden);
		assert.deepEqual(current.meetings, []);
	});
});

describe('field service meeting receipts', () => {
	it('acknowledges submitted records using their persisted revisions and timestamps', () => {
		const upload = { ...createMeeting(), revision: 'base' };
		const document = createDocument();
		document.meetings = [
			{ ...createMeeting(), meeting_uid: 'unsubmitted', revision: 'other' },
			{ ...createMeeting(), revision: 'persisted' },
		];

		assert.deepEqual(getFieldServiceMeetingReceipts(document, [upload]), [{
			meeting_uid: 'meeting',
			base_revision: 'base',
			revision: 'persisted',
			updatedAt: document.meetings[1].authorization.updatedAt,
		}]);
	});

	it('never acknowledges missing or uncommitted meeting records', () => {
		const document = createDocument();
		assert.throws(() => getFieldServiceMeetingReceipts(document, [createMeeting()]));
		document.meetings = [createMeeting()];
		assert.throws(() => getFieldServiceMeetingReceipts(document, [createMeeting()]));
	});
});
