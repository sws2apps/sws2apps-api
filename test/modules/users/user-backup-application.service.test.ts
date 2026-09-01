import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BackupData } from '#modules/backups/backup.types.js';
import type { User } from '#modules/users/user.js';
import {
	applyUserBackup,
	type UserBackupDataOperations,
} from '#modules/users/services/user-backup-application.service.js';

const createUser = () => {
	const savedData: string[] = [];

	const user = {
		id: 'user-1',
		profile: {
			firstname: { value: 'Old', updatedAt: 'before' },
			lastname: { value: 'Name', updatedAt: 'before' },
			role: 'pocket',
		},
		settings: {
			backup_automatic: 'old-backup',
			data_view: 'old-view',
			hour_credits_enabled: 'old-credits',
			theme_follow_os_enabled: 'old-theme',
		},
	} as User;

	const dataOperations: UserBackupDataOperations = {
		updateProfile: async (_user, profile) => {
			user.profile = profile;
		},
		updateSettings: async (_user, settings) => {
			user.settings = settings;
		},
		saveBibleStudies: async () => {
			savedData.push('bible-studies');
		},
		saveFieldServiceReports: async () => {
			savedData.push('field-service-reports');
		},
		saveDelegatedFieldServiceReports: async () => {
			savedData.push('delegated-field-service-reports');
		},
	};

	return { user, savedData, dataOperations };
};

describe('user backup application', () => {
	it('restores profile and user settings from the backup', async () => {
		const { user, dataOperations } = createUser();
		const backup = {
			app_settings: {
				user_settings: {
					firstname: { value: 'New', updatedAt: 'after' },
					lastname: { value: 'Person', updatedAt: 'after' },
					backup_automatic: 'new-backup',
					data_view: 'new-view',
					hour_credits_enabled: 'new-credits',
					theme_follow_os_enabled: 'new-theme',
				},
			},
		} as BackupData;

		await applyUserBackup(user, backup, [], dataOperations);

		assert.deepEqual(user.profile.firstname, { value: 'New', updatedAt: 'after' });
		assert.deepEqual(user.profile.lastname, { value: 'Person', updatedAt: 'after' });
		assert.equal(user.settings.backup_automatic, 'new-backup');
		assert.equal(user.settings.data_view, 'new-view');
		assert.equal(user.settings.hour_credits_enabled, 'new-credits');
		assert.equal(user.settings.theme_follow_os_enabled, 'new-theme');
	});

	it('restores personal data only for publishers', async () => {
		const backup = {
			user_bible_studies: [{}],
			user_field_service_reports: [{}],
			delegated_field_service_reports: [{}],
		} as BackupData;
		const publisher = createUser();
		const nonPublisher = createUser();

		await applyUserBackup(publisher.user, backup, ['publisher'], publisher.dataOperations);
		await applyUserBackup(nonPublisher.user, backup, ['admin'], nonPublisher.dataOperations);

		assert.deepEqual(publisher.savedData, [
			'bible-studies',
			'field-service-reports',
			'delegated-field-service-reports',
		]);
		assert.deepEqual(nonPublisher.savedData, []);
	});
});
