import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	getPocketBackupContext,
	retrievePocketBackup,
	parsePocketBackupMetadata,
	PocketBackupError,
	submitPocketBackup,
} from '#modules/pockets/pocket-backup.service.js';
import type { BackupData } from '#modules/backups/index.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

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
			const backup = await retrievePocketBackup(user.id, JSON.stringify(requestedMetadata));
			assert.equal(backup.app_settings.cong_settings?.cong_master_key, undefined);
			assert.equal(congregation.settings.cong_master_key, 'private-master-key');
			const userSettings = backup.app_settings.user_settings as Record<string, unknown>;
			assert.equal(userSettings.backup_automatic, dataSyncEnabled ? 'encrypted-preference' : undefined);
			assert.equal(userSettings.theme_follow_os_enabled, undefined);
			assert.equal(backup.metadata.user_settings, user.metadata.user_settings);
			assert.equal(backup.metadata.cong_settings, congregation.metadata.cong_settings);
			assert.equal(backup.persons, undefined);
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
});
