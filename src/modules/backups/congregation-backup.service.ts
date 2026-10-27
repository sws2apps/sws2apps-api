import type { AppRoleType } from '#domain/users/app-role.js';
import { getUserCapabilities } from '#domain/users/user-capabilities.js';
import {
	type Congregation,
	type CongSettingsType,
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
import { getManagedFieldServiceGroupIds } from '#modules/field-service-meetings/index.js';
import type { BackupDataWithOptionalMetadata } from './backup.types.js';
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
	getManagedGroupIds: typeof getManagedFieldServiceGroupIds;
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
	getManagedGroupIds: getManagedFieldServiceGroupIds,
};

const savePeopleAndSpeakers = async (
	congregation: Congregation,
	backup: BackupDataWithOptionalMetadata,
	capabilities: ReturnType<typeof getUserCapabilities>,
	operations: CongregationBackupOperations,
): Promise<void> => {
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
};

const saveAdministrationAndSchedules = async (
	congregation: Congregation,
	backup: BackupDataWithOptionalMetadata,
	capabilities: ReturnType<typeof getUserCapabilities>,
	operations: CongregationBackupOperations,
): Promise<void> => {
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
};

const saveReportsAndEvents = async (
	congregation: Congregation,
	backup: BackupDataWithOptionalMetadata,
	capabilities: ReturnType<typeof getUserCapabilities>,
	operations: CongregationBackupOperations,
): Promise<void> => {
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
};

/** Merge recurring rows by stable group identity, retaining each field's revision. */
const mergeFieldServiceTimes = (
	current: CongSettingsType['field_service_meeting_times'],
	incoming: NonNullable<CongSettingsType['field_service_meeting_times']>,
) => {
	const rows = new Map((current ?? []).map((row) => [row.type, structuredClone(row)]));
	for (const row of incoming) {
		const existing = rows.get(row.type);
		rows.set(row.type, existing ? mergeIncomingData(existing, row) : structuredClone(row));
	}
	return [...rows.values()];
};

type RecurringTimes = NonNullable<CongSettingsType['field_service_meeting_times']>;

/** Recurring times follow meeting scheduling rights: all groups, or only the groups a scheduler manages. */
const authorizedRecurringTimes = async (
	congregation: Congregation,
	incoming: RecurringTimes | undefined,
	capabilities: ReturnType<typeof getUserCapabilities>,
	personUid: string | undefined,
	operations: CongregationBackupOperations,
): Promise<RecurringTimes> => {
	if (!incoming?.length) return [];
	if (capabilities.fieldServiceAllGroups) return incoming;
	if (!capabilities.fieldServiceScheduler || !personUid) return [];
	const managed = await operations.getManagedGroupIds(congregation.id, personUid);
	return incoming.filter((row) => managed.has(row.type));
};

/**
 * Restores congregation data according to the caller's capabilities and the
 * congregation's data-sync setting. Server-owned access credentials are
 * preserved, and user-role updates are restricted to current members.
 */
export const saveCongregationBackup = async (
	congregation: Congregation,
	backup: BackupDataWithOptionalMetadata,
	userRoles: AppRoleType[],
	operations: CongregationBackupOperations = defaultCongregationBackupOperations,
	personUid?: string,
): Promise<void> => {
	const capabilities = getUserCapabilities(userRoles);
	const incomingSettings = backup.app_settings?.cong_settings
		? structuredClone(backup.app_settings.cong_settings)
		: undefined;
	const recurringTimes = await authorizedRecurringTimes(
		congregation,
		incomingSettings?.field_service_meeting_times,
		capabilities,
		personUid,
		operations,
	);

	if (incomingSettings && (capabilities.scheduleEditor || recurringTimes.length > 0)) {
		const settings = structuredClone(congregation.settings);
		if (capabilities.scheduleEditor) {
			incomingSettings.cong_access_code = congregation.settings.cong_access_code;
			incomingSettings.cong_master_key = congregation.settings.cong_master_key;
			delete incomingSettings.field_service_meeting_times;
			mergeIncomingData(settings, incomingSettings);
		}
		if (recurringTimes.length > 0) {
			settings.field_service_meeting_times = mergeFieldServiceTimes(settings.field_service_meeting_times, recurringTimes);
		}
		await operations.saveSettings(congregation, settings);
	}

	if (congregation.settings.data_sync.value) {
		await savePeopleAndSpeakers(congregation, backup, capabilities, operations);
		await saveAdministrationAndSchedules(congregation, backup, capabilities, operations);
		await saveReportsAndEvents(congregation, backup, capabilities, operations);
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
