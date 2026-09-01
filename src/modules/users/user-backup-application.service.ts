import type { AppRoleType } from '../../domain/users/app-role.js';
import type { BackupData } from '../backups/index.js';
import type { User } from './user.js';
import type { UserProfile } from './user.types.js';

export const applyUserBackup = async (
	user: User,
	congregationBackup: BackupData,
	userRoles: AppRoleType[],
): Promise<void> => {
	const userSettings = congregationBackup.app_settings?.user_settings;

	if (userSettings) {
		const backupSettings = userSettings as Record<string, object | string>;

		const profile = structuredClone(user.profile);
		profile.firstname = backupSettings.firstname as UserProfile['firstname'];
		profile.lastname = backupSettings.lastname as UserProfile['lastname'];

		await user.updateProfile(profile);

		const settings = structuredClone(user.settings);
		settings.backup_automatic = backupSettings.backup_automatic as string;
		settings.data_view = backupSettings.data_view as string;
		settings.hour_credits_enabled = backupSettings.hour_credits_enabled as string;
		settings.theme_follow_os_enabled = backupSettings.theme_follow_os_enabled as string;

		await user.updateSettings(settings);
	}

	if (!userRoles.includes('publisher')) return;

	if (congregationBackup.user_bible_studies) {
		await user.saveBibleStudies(congregationBackup.user_bible_studies);
	}

	if (congregationBackup.user_field_service_reports) {
		await user.saveFieldServiceReports(congregationBackup.user_field_service_reports);
	}

	if (congregationBackup.delegated_field_service_reports) {
		await user.saveDelegatedFieldServiceReports(
			congregationBackup.delegated_field_service_reports,
		);
	}
};
