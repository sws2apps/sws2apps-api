import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { AppRoleType } from '#domain/users/app-role.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import { UserBackupError } from '#modules/users/user-backup-context.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';
import {
	filterBackupMetadata,
	saveUserBackup,
} from '#modules/users/services/user-backup-upload.service.js';

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
});