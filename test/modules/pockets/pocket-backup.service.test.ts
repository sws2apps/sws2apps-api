import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	getPocketBackupContext,
	retrievePocketBackup as retrieveBackup,
	parsePocketBackupMetadata,
	PocketBackupError,
	submitPocketBackup,
} from '#modules/pockets/pocket-backup.service.js';
import type { BackupData } from '#modules/backups/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

const retrievePocketBackup: typeof retrieveBackup = (userId, metadata, operations = {}) => retrieveBackup(userId, metadata, {
	getMetadata: async () => ({ field_service_meetings: CongregationsList.list[0]?.metadata.field_service_meetings ?? '', field_service_scheduling: CongregationsList.list[0]?.metadata.field_service_scheduling ?? '' }),
	...operations,
});

describe('Pocket backup metadata', () => {
	it('accepts a JSON object containing string timestamps', () => {
		const metadata = parsePocketBackupMetadata('{"persons":"2026-08-01T00:00:00.000Z"}');

		assert.deepEqual(metadata, { persons: '2026-08-01T00:00:00.000Z' });
	});

	it('rejects malformed JSON and non-string metadata values', () => {
		for (const metadata of ['not-json', '[]', '{"persons":123}']) {
			assert.throws(
				() => parsePocketBackupMetadata(metadata),
				(error: unknown) =>
					error instanceof PocketBackupError && error.code === 'INVALID_METADATA',
			);
		}
	});
});

const createPocketBackupContext = () => {
	const congregation = new Congregation('congregation-1');
	const user = new User('user-1');
	user.profile.congregation = {
		id: congregation.id,
		account_type: 'pocket',
		cong_role: ['publisher'],
		user_local_uid: 'person-1',
	};
	UsersList.list = [user];
	CongregationsList.list = [congregation];

	const metadata = JSON.stringify({
		...congregation.metadata,
		...user.metadata,
	});
	const backup = { app_settings: {}, metadata: {} } as BackupData;

	return { backup, congregation, metadata, user };
};

describe('Pocket backup submission', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;
		CongregationsList.list = [];
		UsersList.list = [];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('returns a stable error when the Pocket user does not exist', () => {
		assert.throws(
			() => getPocketBackupContext('missing-user', '{}'),
			(error: unknown) => {
				return error instanceof PocketBackupError
					&& error.code === 'USER_NOT_FOUND';
			},
		);
	});

	for (const dataSyncEnabled of [false, true]) {
		it(`projects Pocket settings with data sync ${dataSyncEnabled}`, async () => {
			const { congregation, metadata, user } = createPocketBackupContext();
			congregation.members = [user];
			congregation.settings.data_sync.value = dataSyncEnabled;
			congregation.settings.cong_master_key = 'private-master-key';
			user.settings.backup_automatic = 'encrypted-preference';
			const requestedMetadata = JSON.parse(metadata) as Record<string, string>;
			requestedMetadata.user_settings = 'old-user-settings';
			requestedMetadata.cong_settings = 'old-congregation-settings';
			const backup = await retrievePocketBackup(user.id, JSON.stringify(requestedMetadata), {
				getPersons: async () => [],
			});
			assert.equal(backup.app_settings.cong_settings?.cong_master_key, undefined);
			assert.equal(congregation.settings.cong_master_key, 'private-master-key');
			const userSettings = backup.app_settings.user_settings as Record<string, unknown>;
			assert.equal(userSettings.backup_automatic, dataSyncEnabled ? 'encrypted-preference' : undefined);
			assert.equal(userSettings.theme_follow_os_enabled, undefined);
			assert.equal(backup.metadata.user_settings, user.metadata.user_settings);
			assert.equal(backup.metadata.cong_settings, congregation.metadata.cong_settings);
			assert.deepEqual(backup.persons, dataSyncEnabled ? [] : undefined);
		});
	}

	it('awaits a successful persistence outcome', async () => {
		const { backup, metadata, user } = createPocketBackupContext();
		let persistenceCompleted = false;

		await submitPocketBackup(user.id, metadata, backup, {
			saveBackup: async (input) => {
				assert.equal(input.userId, user.id);
				assert.deepEqual(input.userRole, ['publisher']);
				assert.equal(input.cong_backup, backup);
				persistenceCompleted = true;
				return { status: 'saved' };
			},
		});

		assert.equal(persistenceCompleted, true);
	});

	it('converts a failed persistence outcome into a stable service error', async () => {
		const { backup, metadata, user } = createPocketBackupContext();

		await assert.rejects(
			submitPocketBackup(user.id, metadata, backup, {
				saveBackup: async () => ({ status: 'failed' }),
			}),
			(error: unknown) => {
				return error instanceof PocketBackupError
					&& error.code === 'PERSISTENCE_FAILED';
			},
		);
	});

	it('rejects a meeting upload if synchronization is disabled while waiting', async () => {
		const { backup, congregation, metadata, user } = createPocketBackupContext();
		congregation.settings.data_sync.value = true;
		backup.field_service_meetings = [{ meeting_uid: 'one', meeting_data: 'cipher', authorization: { category: 0, group_id: 'group', conductor: 'conductor', deleted: false, updatedAt: '2026-10-26T00:00:00Z' } }];
		const initialMetadata = { ...congregation.metadata };

		await assert.rejects(submitPocketBackup(user.id, metadata, backup, {
			saveBackup: async () => ({ status: 'saved' }),
			saveMeetings: async (_id, resolveActor) => {
				resolveActor();
				congregation.settings.data_sync.value = false;
				resolveActor();
				throw new Error('Disabled synchronization was accepted');
			},
		}), (error: unknown) => error instanceof PocketBackupError && error.code === 'MEMBERSHIP_REQUIRED');
		assert.deepEqual(congregation.metadata, initialMetadata);
	});

	it('validates malformed meeting and scope payloads before any persistence', async () => {
		const { backup, metadata, user } = createPocketBackupContext();
		for (const payload of [
			{ field_service_meetings: null },
			{ field_service_meetings: [{ meeting_uid: 'unvalidated' }] },
			{ field_service_scheduling: { base_revision: '', groups: 'invalid' } },
		]) {
			let persisted = false;
			await assert.rejects(submitPocketBackup(user.id, metadata, { ...backup, ...payload } as BackupData, {
				saveBackup: async () => { persisted = true; return { status: 'saved' }; },
			}), (error: unknown) => error instanceof PocketBackupError && error.code === 'INVALID_BACKUP');
			assert.equal(persisted, false);
		}
	});

	it('accepts an empty meeting list as an ordinary backup with synchronization disabled', async () => {
		const { backup, metadata, user } = createPocketBackupContext();
		backup.field_service_meetings = [];
		const result = await submitPocketBackup(user.id, metadata, backup, {
			saveBackup: async () => ({ status: 'saved' }),
			saveMeetings: async () => { throw new Error('Empty meeting write must be skipped'); },
		});
		assert.deepEqual(result.field_service_meeting_receipts, []);
	});

	it('refreshes sanitized persons when scheduling rights are removed', async () => {
		const { user, congregation } = createPocketBackupContext();
		congregation.settings.data_sync.value = true;
		user.metadata.user_settings = 'new-roles';
		const metadata = JSON.stringify({ ...congregation.metadata, ...user.metadata, user_settings: 'old-roles' });
		const result = await retrievePocketBackup(user.id, metadata, {
			getPersons: async () => [{ person_uid: 'other', person_data: { assignments: 'private', archived: 'private' } }],
		});
		assert.equal((result.persons[0].person_data as Record<string, unknown>).assignments, undefined);
		assert.equal((result.persons[0].person_data as Record<string, unknown>).archived, undefined);
	});
});

describe('Pocket field-service access', () => {
	it('downloads meetings for every group without an editing role', async () => {
		const oldUsers = UsersList.list; const oldCongregations = CongregationsList.list;
		try {
			const { user, congregation } = createPocketBackupContext();
			user.profile.congregation!.cong_role = [];
			congregation.members = [user]; congregation.settings.data_sync.value = true;
			const groups = [{ group_id: 'first' }, { group_id: 'second' }];
			const meetings = ['first', 'second'].map((group_id) => ({ meeting_uid: group_id, meeting_data: 'cipher', authorization: { category: 0 as const, group_id, conductor: 'conductor', deleted: false, updatedAt: '2026-10-26T00:00:00Z' } }));
			const metadata = JSON.stringify({ ...congregation.metadata, ...user.metadata, field_service_groups: 'old' });
			const result = await retrievePocketBackup(user.id, metadata, {
				getMetadata: async () => ({ field_service_meetings: 'fresh', field_service_scheduling: 'scope-fresh' }),
				getMeetings: async () => meetings,
				getGroups: async () => groups,
			});
			assert.deepEqual(result.field_service_meetings, meetings);
			assert.equal(result.metadata.field_service_scheduling, 'scope-fresh');
			assert.equal(result.app_settings.cong_settings?.cong_master_key, undefined);
			assert.deepEqual(result.field_service_groups, groups);
		} finally { UsersList.list = oldUsers; CongregationsList.list = oldCongregations; }
	});
	it('uses current membership when submitting a granted editing right', async () => {
		const oldUsers = UsersList.list; const oldCongregations = CongregationsList.list;
		try {
			const { user, congregation, backup } = createPocketBackupContext();
			congregation.members = [user]; congregation.settings.data_sync.value = true;
			user.profile.congregation!.cong_role = ['field_service_schedule'];
			backup.field_service_meetings = [{ meeting_uid: 'meeting', meeting_data: 'cipher', authorization: { category: 0, group_id: 'group', conductor: 'conductor', deleted: false, updatedAt: '2026-10-26T00:00:00Z' } }];
			let checked = false;
			await submitPocketBackup(user.id, JSON.stringify({ ...congregation.metadata, ...user.metadata }), backup, {
				saveBackup: async () => ({ status: 'saved' }),
				saveMeetings: async (id, resolveActor) => {
					assert.equal(id, congregation.id); assert.deepEqual(resolveActor().roles, ['field_service_schedule']); checked = true;
					return { scope: [], scope_revision: '', meetings_revision: 'r1', meetings: [{ ...backup.field_service_meetings![0], revision: 'r1' }] };
				},
			});
			assert.equal(checked, true);
		} finally { UsersList.list = oldUsers; CongregationsList.list = oldCongregations; }
	});
});
