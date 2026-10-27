import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { AppRoleType } from '#domain/users/app-role.js';
import { discardBackupUpload } from '#modules/backups/index.js';
import type { FieldServiceMeetingRecord } from '#modules/field-service-meetings/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { UserBackupError } from '#modules/users/user-backup-context.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';
import {
	filterBackupMetadata,
	saveUserBackup,
	saveUserChunkedBackup,
	type UserBackupUploadOperations,
} from '#modules/users/services/user-backup-upload.service.js';

const createSchedulingContext = () => {
	const congregation = new Congregation('congregation-1');
	congregation.settings.data_sync.value = true;
	const user = new User('user-1');
	user.profile.congregation = {
		id: congregation.id,
		account_type: 'vip',
		cong_role: ['field_service_schedule'],
		user_local_uid: 'scheduler',
	};
	congregation.members = [user];
	UsersList.list = [user];
	CongregationsList.list = [congregation];
	const meeting: FieldServiceMeetingRecord = {
		meeting_uid: 'meeting',
		meeting_data: 'encrypted-content',
		authorization: {
			category: 0,
			group_id: 'group',
			conductor: 'conductor',
			deleted: false,
			updatedAt: '2026-10-26T08:00:00.000Z',
		},
	};
	return { user, congregation, meeting };
};

const schedulingUploads: {
	name: string;
	upload: (
		userId: string,
		backup: unknown,
		operations: Partial<UserBackupUploadOperations>,
	) => ReturnType<typeof saveUserBackup> | ReturnType<typeof saveUserChunkedBackup>;
}[] = [
	{
		name: 'regular',
		upload: (id, backup, operations) => saveUserBackup(id, backup, operations),
	},
	{
		name: 'chunked',
		upload: (id, backup, operations) => saveUserChunkedBackup(id, '{}', {
			uploadId: 'scheduling-upload',
			chunkIndex: 0,
			totalChunks: 1,
			chunkData: JSON.stringify(backup),
		}, operations),
	},
];

describe('user backup upload metadata', () => {
	it('keeps only settings metadata when congregation data sync is disabled', () => {
		const metadata = {
			user_settings: '2026-08-30T10:00:00.000Z',
			cong_settings: '2026-08-30T10:00:00.000Z',
			persons: '2026-08-30T10:00:00.000Z',
			schedules: '2026-08-30T10:00:00.000Z',
		};

		const result = filterBackupMetadata(metadata, false);

		assert.deepEqual(result, {
			user_settings: '2026-08-30T10:00:00.000Z',
			cong_settings: '2026-08-30T10:00:00.000Z',
		});
		assert.deepEqual(metadata, {
			user_settings: '2026-08-30T10:00:00.000Z',
			cong_settings: '2026-08-30T10:00:00.000Z',
			persons: '2026-08-30T10:00:00.000Z',
			schedules: '2026-08-30T10:00:00.000Z',
		});
	});

	it('keeps all incoming metadata when congregation data sync is enabled', () => {
		const metadata = {
			user_settings: 'user-date',
			persons: 'person-date',
		};

		const result = filterBackupMetadata(metadata, true);

		assert.deepEqual(result, metadata);
	});
});

describe('user backup upload payload validation', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;
		CongregationsList.list = [];
		UsersList.list = [];
	});

	afterEach(() => {
		discardBackupUpload('scheduling-upload');
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('rejects a regular upload that omits metadata as an invalid backup', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.settings.cong_name = 'Central';
		const roles: AppRoleType[] = ['admin'];

		const user = new User('user-1');
		user.profile.role = 'vip';
		user.profile.congregation = {
			id: congregation.id,
			account_type: 'vip',
			cong_role: roles,
			user_local_uid: 'person-self',
			user_members_delegate: [],
		};

		congregation.members = [user];
		CongregationsList.list = [congregation];
		UsersList.list = [user];

		await assert.rejects(
			saveUserBackup('user-1', { app_settings: {}, persons: [] }),
			(error: unknown) => error instanceof UserBackupError && error.code === 'INVALID_BACKUP',
		);
	});

	for (const { name, upload } of schedulingUploads) {
		it(`accepts an empty ${name} meeting upload when synchronization is disabled`, async () => {
			const { user, congregation } = createSchedulingContext();
			congregation.settings.data_sync.value = false;
			const result = await upload(user.id, { metadata: {}, field_service_meetings: [] }, {
				saveBackup: async () => ({ status: 'saved' }),
				saveMeetings: async () => { throw new Error('Empty meeting write must be skipped'); },
			});
			assert.equal(result.status, 'saved');
		});
		it(`rejects a ${name} meeting upload if synchronization is disabled while waiting`, async () => {
			const { user, congregation, meeting } = createSchedulingContext();
			const initialMetadata = { ...congregation.metadata };

			await assert.rejects(upload(user.id, { metadata: {}, field_service_meetings: [meeting] }, {
				saveBackup: async () => ({ status: 'saved' }),
				saveMeetings: async (_id, resolveActor) => {
					assert.deepEqual(resolveActor().roles, ['field_service_schedule']);
					congregation.settings.data_sync.value = false;
					resolveActor();
					throw new Error('Disabled synchronization was accepted');
				},
			}), (error: unknown) => error instanceof UserBackupError && error.code === 'INVALID_BACKUP');
			assert.deepEqual(congregation.metadata, initialMetadata);
		});

		it(`returns ${name} meeting receipts only after both persistence steps succeed`, async () => {
			const { user, congregation, meeting } = createSchedulingContext();
			const steps: string[] = [];
			const result = await upload(user.id, { metadata: {}, field_service_meetings: [meeting] }, {
				saveBackup: async () => {
					steps.push('backup');
					return { status: 'saved' };
				},
				saveMeetings: async (_id, resolveActor) => {
					assert.equal(resolveActor().personUid, 'scheduler');
					steps.push('meetings');
					return {
						scope: [],
						scope_revision: 'scope',
						meetings: [{ ...meeting, revision: 'accepted' }],
						meetings_revision: 'accepted',
					};
				},
			});

			assert.deepEqual(steps, ['backup', 'meetings']);
			assert.equal(result.status, 'saved');
			if (result.status !== 'saved') throw new Error('Expected saved backup');
			assert.deepEqual(result.field_service_meeting_receipts, [{
				meeting_uid: meeting.meeting_uid,
				base_revision: undefined,
				revision: 'accepted',
				updatedAt: meeting.authorization.updatedAt,
			}]);
			assert.equal(congregation.metadata.field_service_meetings, 'accepted');
			assert.equal(congregation.metadata.field_service_scheduling, 'scope');
		});
	}
});
