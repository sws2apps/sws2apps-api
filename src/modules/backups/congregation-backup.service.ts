import type { AppRoleType } from '#domain/users/app-role.js';
import { getUserCapabilities } from '#domain/users/user-capabilities.js';
import {
	type Congregation,
	saveCongregationIncomingReports,
	saveCongregationOutgoingSpeakers,
	saveCongregationPersons,
	saveCongregationSettings,
	saveCongregationSpeakersKey,
	saveCongregationStandardData,
} from '#modules/congregations/index.js';
import {
	UsersList,
	updateUserProfile,
	type User,
	type UserProfile,
} from '#modules/users/index.js';
import type { BackupData } from './backup.types.js';
import { mergeIncomingData } from './incoming-data-merge.js';

export type CongregationBackupOperations = {
	saveSettings: typeof saveCongregationSettings;
	savePersons: typeof saveCongregationPersons;
	saveStandardData: typeof saveCongregationStandardData;
	saveSpeakersKey: typeof saveCongregationSpeakersKey;
	saveOutgoingSpeakers: typeof saveCongregationOutgoingSpeakers;
	saveIncomingReports: typeof saveCongregationIncomingReports;
	findUserById: (userId: string) => User | undefined;
	updateProfile: (user: User, profile: UserProfile) => Promise<void>;
};

const defaultCongregationBackupOperations: CongregationBackupOperations = {
	saveSettings: saveCongregationSettings,
	savePersons: saveCongregationPersons,
	saveStandardData: saveCongregationStandardData,
	saveSpeakersKey: saveCongregationSpeakersKey,
	saveOutgoingSpeakers: saveCongregationOutgoingSpeakers,
	saveIncomingReports: saveCongregationIncomingReports,
	findUserById: (userId) => UsersList.findById(userId),
	updateProfile: updateUserProfile,
};

/**
 * Restores congregation data according to the caller's capabilities and the
 * congregation's data-sync setting. Server-owned access credentials are
 * preserved, and user-role updates are restricted to current members.
 */
export const saveCongregationBackup = async (
	congregation: Congregation,
	backup: BackupData,
	userRoles: AppRoleType[],
	operations: CongregationBackupOperations = defaultCongregationBackupOperations,
): Promise<void> => {
	const capabilities = getUserCapabilities(userRoles);

	if (capabilities.scheduleEditor && backup.app_settings?.cong_settings) {
		const incomingSettings = structuredClone(backup.app_settings.cong_settings);
		incomingSettings.cong_access_code = congregation.settings.cong_access_code;
		incomingSettings.cong_master_key = congregation.settings.cong_master_key;

		const settings = structuredClone(congregation.settings);
		mergeIncomingData(settings, incomingSettings);
		await operations.saveSettings(congregation, settings);
	}

	if (congregation.settings.data_sync.value) {
		if (capabilities.scheduleEditor && backup.persons) {
			await operations.savePersons(congregation, backup.persons);
		}

		if (capabilities.publicTalkEditor && backup.speakers_congregations) {
			await operations.saveStandardData(
				congregation,
				'speakers_congregations',
				backup.speakers_congregations,
			);
		}

		if (capabilities.publicTalkEditor && backup.visiting_speakers) {
			await operations.saveStandardData(
				congregation,
				'visiting_speakers',
				backup.visiting_speakers,
			);
		}

		if (capabilities.publicTalkEditor && backup.speakers_key) {
			await operations.saveSpeakersKey(congregation, backup.speakers_key);
		}

		if (capabilities.adminRole && backup.branch_cong_analysis) {
			await operations.saveStandardData(
				congregation,
				'branch_cong_analysis',
				backup.branch_cong_analysis,
			);
		}

		if (capabilities.adminRole && backup.branch_field_service_reports) {
			await operations.saveStandardData(
				congregation,
				'branch_field_service_reports',
				backup.branch_field_service_reports,
			);
		}

		if (capabilities.serviceCommiteeRole && backup.field_service_groups) {
			await operations.saveStandardData(
				congregation,
				'field_service_groups',
				backup.field_service_groups,
			);
		}

		if (capabilities.scheduleEditor && backup.sched) {
			await operations.saveStandardData(congregation, 'schedules', backup.sched);
		}

		if (capabilities.scheduleEditor && backup.sources) {
			await operations.saveStandardData(congregation, 'sources', backup.sources);
		}

		if (capabilities.reportEditorRole && backup.cong_field_service_reports) {
			await operations.saveStandardData(
				congregation,
				'cong_field_service_reports',
				backup.cong_field_service_reports,
			);
		}

		if (capabilities.attendanceTracker && backup.meeting_attendance) {
			await operations.saveStandardData(
				congregation,
				'meeting_attendance',
				backup.meeting_attendance,
			);
		}

		if (capabilities.adminRole && backup.upcoming_events) {
			await operations.saveStandardData(congregation, 'upcoming_events', backup.upcoming_events);
		}

		if (capabilities.publicTalkEditor && backup.outgoing_speakers) {
			await operations.saveOutgoingSpeakers(congregation, backup.outgoing_speakers);
		}

		if (capabilities.secretaryRole && backup.incoming_reports) {
			await operations.saveIncomingReports(congregation, backup.incoming_reports);
		}
	}

	if (capabilities.adminRole && backup.cong_users) {
		for (const backupUser of backup.cong_users) {
			const user = operations.findUserById(backupUser.id);
			const membership = user?.profile.congregation;

			if (!user || membership?.id !== congregation.id) continue;

			const profile = structuredClone(user.profile);
			profile.congregation = {
				...membership,
				cong_role: backupUser.role ?? [],
			};
			await operations.updateProfile(user, profile);
		}
	}
};
