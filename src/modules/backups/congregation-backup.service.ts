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
import { UsersList } from '#modules/users/index.js';
import { updateUserProfile } from '#modules/users/index.js';
import type { BackupData } from './backup.types.js';
import { mergeIncomingData } from './incoming-data-merge.js';

export const saveCongregationBackup = async (
	congregation: Congregation,
	backup: BackupData,
	userRoles: AppRoleType[],
): Promise<void> => {
	const capabilities = getUserCapabilities(userRoles);

	if (capabilities.scheduleEditor && backup.app_settings?.cong_settings) {
		backup.app_settings.cong_settings.cong_access_code = congregation.settings.cong_access_code;
		backup.app_settings.cong_settings.cong_master_key = congregation.settings.cong_master_key;

		const settings = structuredClone(congregation.settings);
		mergeIncomingData(settings, backup.app_settings.cong_settings);
		await saveCongregationSettings(congregation, settings);
	}

	if (congregation.settings.data_sync.value) {
		if (capabilities.scheduleEditor && backup.persons) {
			await saveCongregationPersons(congregation, backup.persons);
		}

		if (capabilities.publicTalkEditor && backup.speakers_congregations) {
			await saveCongregationStandardData(congregation, 'speakers_congregations', backup.speakers_congregations);
		}

		if (capabilities.publicTalkEditor && backup.visiting_speakers) {
			await saveCongregationStandardData(congregation, 'visiting_speakers', backup.visiting_speakers);
		}

		if (capabilities.publicTalkEditor && backup.speakers_key) {
			await saveCongregationSpeakersKey(congregation, backup.speakers_key);
		}

		if (capabilities.adminRole && backup.branch_cong_analysis) {
			await saveCongregationStandardData(congregation, 'branch_cong_analysis', backup.branch_cong_analysis);
		}

		if (capabilities.adminRole && backup.branch_field_service_reports) {
			await saveCongregationStandardData(congregation, 'branch_field_service_reports', backup.branch_field_service_reports);
		}

		if (capabilities.serviceCommiteeRole && backup.field_service_groups) {
			await saveCongregationStandardData(congregation, 'field_service_groups', backup.field_service_groups);
		}

		if (capabilities.scheduleEditor && backup.sched) {
			await saveCongregationStandardData(congregation, 'schedules', backup.sched);
		}

		if (capabilities.scheduleEditor && backup.sources) {
			await saveCongregationStandardData(congregation, 'sources', backup.sources);
		}

		if (capabilities.reportEditorRole && backup.cong_field_service_reports) {
			await saveCongregationStandardData(congregation, 'cong_field_service_reports', backup.cong_field_service_reports);
		}

		if (capabilities.attendanceTracker && backup.meeting_attendance) {
			await saveCongregationStandardData(congregation, 'meeting_attendance', backup.meeting_attendance);
		}

		if (capabilities.adminRole && backup.upcoming_events) {
			await saveCongregationStandardData(congregation, 'upcoming_events', backup.upcoming_events);
		}

		if (capabilities.publicTalkEditor && backup.outgoing_speakers) {
			await saveCongregationOutgoingSpeakers(congregation, backup.outgoing_speakers);
		}

		if (capabilities.secretaryRole && backup.incoming_reports) {
			await saveCongregationIncomingReports(congregation, backup.incoming_reports);
		}
	}

	if (capabilities.adminRole && backup.cong_users) {
		for (const backupUser of backup.cong_users) {
			const user = UsersList.findById(backupUser.id);
			if (!user) continue;

			const profile = structuredClone(user.profile);
			profile.congregation!.cong_role = backupUser.role || [];
			await updateUserProfile(user, profile);
		}
	}
};
