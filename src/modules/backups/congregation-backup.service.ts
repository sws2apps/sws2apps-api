import type { AppRoleType } from '../../domain/users/app-role.js';
import { getUserCapabilities } from '../../domain/users/user-capabilities.js';
import type { Congregation } from '../congregations/congregation.js';
import { UsersList } from '../users/users.js';
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
		await congregation.saveSettings(settings);
	}

	if (congregation.settings.data_sync.value) {
		if (capabilities.scheduleEditor && backup.persons) {
			await congregation.savePersons(backup.persons);
		}

		if (capabilities.publicTalkEditor && backup.speakers_congregations) {
			await congregation.saveSpeakersCongregations(backup.speakers_congregations);
		}

		if (capabilities.publicTalkEditor && backup.visiting_speakers) {
			await congregation.saveVisitingSpeakers(backup.visiting_speakers);
		}

		if (capabilities.publicTalkEditor && backup.speakers_key) {
			await congregation.saveSpeakersKey(backup.speakers_key);
		}

		if (capabilities.adminRole && backup.branch_cong_analysis) {
			await congregation.saveBranchCongAnalysis(backup.branch_cong_analysis);
		}

		if (capabilities.adminRole && backup.branch_field_service_reports) {
			await congregation.saveBranchFieldServiceReports(backup.branch_field_service_reports);
		}

		if (capabilities.serviceCommiteeRole && backup.field_service_groups) {
			await congregation.saveFieldServiceGroups(backup.field_service_groups);
		}

		if (capabilities.scheduleEditor && backup.sched) {
			await congregation.saveSchedules(backup.sched);
		}

		if (capabilities.scheduleEditor && backup.sources) {
			await congregation.saveSources(backup.sources);
		}

		if (capabilities.reportEditorRole && backup.cong_field_service_reports) {
			await congregation.saveFieldServiceReports(backup.cong_field_service_reports);
		}

		if (capabilities.attendanceTracker && backup.meeting_attendance) {
			await congregation.saveMeetingAttendance(backup.meeting_attendance);
		}

		if (capabilities.adminRole && backup.upcoming_events) {
			await congregation.saveUpcomingEvents(backup.upcoming_events);
		}

		if (capabilities.publicTalkEditor && backup.outgoing_speakers) {
			await congregation.saveOutgoingSpeakers(backup.outgoing_speakers);
		}

		if (capabilities.secretaryRole && backup.incoming_reports) {
			await congregation.saveIncomingReports(backup.incoming_reports);
		}
	}

	if (capabilities.adminRole && backup.cong_users) {
		for (const backupUser of backup.cong_users) {
			const user = UsersList.findById(backupUser.id);
			if (!user) continue;

			const profile = structuredClone(user.profile);
			profile.congregation!.cong_role = backupUser.role || [];
			await user.updateProfile(profile);
		}
	}
};
