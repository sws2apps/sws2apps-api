import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BackupData } from '#modules/backups/backup.types.js';
import type { User } from '#modules/users/user.js';
import { applyUserBackup } from '#modules/users/services/user-backup-application.service.js';

const createUser = () => {
	const savedData: string[] = [];

	const user = {
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
		async updateProfile(
			this: { profile: User['profile'] },
			profile: User['profile'],
		) {
			this.profile = profile;
		},
		async updateSettings(
			this: { settings: User['settings'] },
			settings: User['settings'],
		) {
			this.settings = settings;
		},
		async saveBibleStudies() {
			savedData.push('bible-studies');
		},
		async saveFieldServiceReports() {
			savedData.push('field-service-reports');
		},
		async saveDelegatedFieldServiceReports() {
			savedData.push('delegated-field-service-reports');
		},
	} as unknown as User;

	return { user, savedData };
};

describe('user backup application', () => {
	it('restores profile and user settings from the backup', async () => {
		const { user } = createUser();
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

		await applyUserBackup(user, backup, []);

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

		await applyUserBackup(publisher.user, backup, ['publisher']);
		await applyUserBackup(nonPublisher.user, backup, ['admin']);

		assert.deepEqual(publisher.savedData, [
			'bible-studies',
			'field-service-reports',
			'delegated-field-service-reports',
		]);
		assert.deepEqual(nonPublisher.savedData, []);
	});
});
