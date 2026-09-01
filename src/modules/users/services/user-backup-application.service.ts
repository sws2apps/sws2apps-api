import type { AppRoleType } from '#domain/users/app-role.js';
import type { BackupData } from '#modules/backups/index.js';
import type { User } from '../user.js';
import type { UserProfile } from '../types/user.types.js';
import {
	saveUserBibleStudies,
	saveUserDelegatedFieldServiceReports,
	saveUserFieldServiceReports,
	updateUserProfile,
	updateUserSettings,
} from './user-data.service.js';

export type UserBackupDataOperations = {
	updateProfile: typeof updateUserProfile;
	updateSettings: typeof updateUserSettings;
	saveBibleStudies: typeof saveUserBibleStudies;
	saveFieldServiceReports: typeof saveUserFieldServiceReports;
	saveDelegatedFieldServiceReports: typeof saveUserDelegatedFieldServiceReports;
};

const defaultDataOperations: UserBackupDataOperations = {
	updateProfile: updateUserProfile,
	updateSettings: updateUserSettings,
	saveBibleStudies: saveUserBibleStudies,
	saveFieldServiceReports: saveUserFieldServiceReports,
	saveDelegatedFieldServiceReports: saveUserDelegatedFieldServiceReports,
};

export const applyUserBackup = async (
	user: User,
	congregationBackup: BackupData,
	userRoles: AppRoleType[],
	dataOperations: UserBackupDataOperations = defaultDataOperations,
): Promise<void> => {
	const userSettings = congregationBackup.app_settings?.user_settings;

	if (userSettings) {
		const backupSettings = userSettings as Record<string, object | string>;

		const profile = structuredClone(user.profile);
		profile.firstname = backupSettings.firstname as UserProfile['firstname'];
		profile.lastname = backupSettings.lastname as UserProfile['lastname'];

		await dataOperations.updateProfile(user, profile);

		const settings = structuredClone(user.settings);
		settings.backup_automatic = backupSettings.backup_automatic as string;
		settings.data_view = backupSettings.data_view as string;
		settings.hour_credits_enabled = backupSettings.hour_credits_enabled as string;
		settings.theme_follow_os_enabled = backupSettings.theme_follow_os_enabled as string;

		await dataOperations.updateSettings(user, settings);
	}

	if (!userRoles.includes('publisher')) return;

	if (congregationBackup.user_bible_studies) {
		await dataOperations.saveBibleStudies(user, congregationBackup.user_bible_studies);
	}

	if (congregationBackup.user_field_service_reports) {
		await dataOperations.saveFieldServiceReports(user, congregationBackup.user_field_service_reports);
	}

	if (congregationBackup.delegated_field_service_reports) {
		await dataOperations.saveDelegatedFieldServiceReports(
			user,
			congregationBackup.delegated_field_service_reports,
		);
	}
};
