import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import { getUserCapabilities } from '#domain/users/user-capabilities.js';
import type { StandardRecord } from '../../../types/standard-record.js';
import { BackupData } from '#modules/backups/index.js';
import {
	type CongSettingsType,
	getBranchCongAnalysis,
	getBranchFieldServiceReports,
	getCongregationPersons,
	getFieldServiceGroups,
	getFieldServiceReports,
	getMeetingAttendance,
	getPublicIncomingTalks,
	getPublicSchedules,
	getPublicSources,
	getSchedules,
	getSources,
	getSpeakersCongregations,
	getUpcomingEvents,
	getVisitingSpeakers,
} from '#modules/congregations/index.js';
import {
	getUserBackupContext,
	parseUserBackupMetadata,
} from '../user-backup-context.js';
import {
	getUserStoredBibleStudies,
	getUserStoredDelegatedFieldServiceReports,
	getUserStoredFieldServiceReports,
} from './user-data.service.js';

export type UserBackupRetrievalOperations = {
	getBranchCongAnalysis: typeof getBranchCongAnalysis;
	getBranchFieldServiceReports: typeof getBranchFieldServiceReports;
	getCongregationPersons: typeof getCongregationPersons;
	getFieldServiceGroups: typeof getFieldServiceGroups;
	getFieldServiceReports: typeof getFieldServiceReports;
	getMeetingAttendance: typeof getMeetingAttendance;
	getPublicIncomingTalks: typeof getPublicIncomingTalks;
	getPublicSchedules: typeof getPublicSchedules;
	getPublicSources: typeof getPublicSources;
	getSchedules: typeof getSchedules;
	getSources: typeof getSources;
	getSpeakersCongregations: typeof getSpeakersCongregations;
	getUpcomingEvents: typeof getUpcomingEvents;
	getUserBibleStudies: typeof getUserStoredBibleStudies;
	getUserDelegatedFieldServiceReports: typeof getUserStoredDelegatedFieldServiceReports;
	getUserFieldServiceReports: typeof getUserStoredFieldServiceReports;
	getVisitingSpeakers: typeof getVisitingSpeakers;
};

const defaultBackupRetrievalOperations: UserBackupRetrievalOperations = {
	getBranchCongAnalysis,
	getBranchFieldServiceReports,
	getCongregationPersons,
	getFieldServiceGroups,
	getFieldServiceReports,
	getMeetingAttendance,
	getPublicIncomingTalks,
	getPublicSchedules,
	getPublicSources,
	getSchedules,
	getSources,
	getSpeakersCongregations,
	getUpcomingEvents,
	getUserBibleStudies: getUserStoredBibleStudies,
	getUserDelegatedFieldServiceReports: getUserStoredDelegatedFieldServiceReports,
	getUserFieldServiceReports: getUserStoredFieldServiceReports,
	getVisitingSpeakers,
};

type UserBackupContext = ReturnType<typeof getUserBackupContext> & {
	metadata: ReturnType<typeof parseUserBackupMetadata>;
	result: BackupData;
	backupOperations: UserBackupRetrievalOperations;
	miniPersons: string[];
	masterKeyNeed: boolean;
	capabilities: ReturnType<typeof getUserCapabilities>;
};

const addSynchronizedSettingsAndGroups = async (context: UserBackupContext): Promise<void> => {
	const { user, congregation, metadata, result, backupOperations, masterKeyNeed } = context;

	result.app_settings = {};
	result.metadata = {};

	if (user.metadata.user_settings !== metadata.user_settings) {
		const localDate = user.metadata.user_settings;
		result.app_settings.user_settings = {
			cong_role: user.profile.congregation?.cong_role,
			firstname: user.profile.firstname,
			lastname: user.profile.lastname,
			user_local_uid: user.profile.congregation?.user_local_uid,
			user_members_delegate: user.profile.congregation?.user_members_delegate,
			backup_automatic: user.settings.backup_automatic?.length > 0 ? user.settings.backup_automatic : undefined,
			theme_follow_os_enabled:
				user.settings.theme_follow_os_enabled?.length > 0 ? user.settings.theme_follow_os_enabled : undefined,
			hour_credits_enabled: user.settings.hour_credits_enabled?.length > 0 ? user.settings.hour_credits_enabled : undefined,
			data_view: user.settings.data_view?.length > 0 ? user.settings.data_view : undefined,
		};

		result.metadata.user_settings = localDate;
	}

	result.app_settings.cong_settings = {
		cong_access_code: congregation.settings.cong_access_code,
		cong_master_key: masterKeyNeed ? congregation.settings.cong_master_key : undefined,
		data_sync: congregation.settings.data_sync,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		country_code: congregation.settings.country_code,
	} as CongSettingsType;

	if (congregation.metadata.cong_settings !== metadata.cong_settings) {
		const localDate = congregation.metadata.cong_settings;
		result.app_settings.cong_settings = structuredClone(congregation.settings);

		if (!masterKeyNeed) {
			result.app_settings.cong_settings.cong_master_key = undefined;
		}

		result.metadata.cong_settings = localDate;
	}

	if (congregation.metadata.field_service_groups !== metadata.field_service_groups) {
		const localDate = congregation.metadata.field_service_groups;
		result.field_service_groups = await backupOperations.getFieldServiceGroups(congregation.id);
		result.metadata.field_service_groups = localDate;
	}

	if (congregation.metadata.upcoming_events !== metadata.upcoming_events) {
		const localDate = congregation.metadata.upcoming_events;
		result.upcoming_events = await backupOperations.getUpcomingEvents(congregation.id);
		result.metadata.upcoming_events = localDate;
	}
};

const addFullPersons = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, capabilities } = context;
	const { personViewer } = capabilities;

	if (!personViewer) return;

	if (congregation.metadata.persons !== metadata.persons) {
		const localDate = congregation.metadata.persons;
		result.persons = await backupOperations.getCongregationPersons(congregation.id);
		result.metadata.persons = localDate;
	}
};

const addSpeakerDirectories = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, capabilities } = context;
	const { elderRole } = capabilities;

	if (!elderRole) return;

	if (congregation.metadata.speakers_congregations !== metadata.speakers_congregations) {
		const localDate = congregation.metadata.speakers_congregations;
		result.speakers_congregations = await backupOperations.getSpeakersCongregations(congregation.id);
		result.metadata.speakers_congregations = localDate;
	}

	if (congregation.metadata.visiting_speakers !== metadata.visiting_speakers) {
		const localDate = congregation.metadata.visiting_speakers;
		result.visiting_speakers = await backupOperations.getVisitingSpeakers(congregation.id);
		result.metadata.visiting_speakers = localDate;
	}
};

const addCongregationReports = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, capabilities } = context;
	const { reportEditorRole } = capabilities;

	if (!reportEditorRole) return;

	if (congregation.metadata.cong_field_service_reports !== metadata.cong_field_service_reports) {
		const localDate = congregation.metadata.cong_field_service_reports;
		result.cong_field_service_reports = await backupOperations.getFieldServiceReports(congregation.id);
		result.metadata.cong_field_service_reports = localDate;
	}
};

const addPublicTalkDetails = async (context: UserBackupContext): Promise<void> => {
	const { congregation, result, backupOperations, capabilities } = context;
	const { publicTalkEditor } = capabilities;

	if (!publicTalkEditor) return;

	result.speakers_key = congregation.outgoing_speakers.speakers_key;
	result.outgoing_talks = await backupOperations.getPublicIncomingTalks(congregation.id);
};

const addPublisherReports = async (context: UserBackupContext): Promise<void> => {
	const { user, congregation, metadata, result, backupOperations, miniPersons, capabilities } = context;
	const { isPublisher, adminRole } = capabilities;

	if (!adminRole && !isPublisher) return;

	if (user.metadata.user_bible_studies !== metadata.user_bible_studies) {
		const localDate = user.metadata.user_bible_studies;
		result.user_bible_studies = await backupOperations.getUserBibleStudies(user.id);
		result.metadata.user_bible_studies = localDate;
	}

	if (user.metadata.user_field_service_reports !== metadata.user_field_service_reports) {
		const localDate = user.metadata.user_field_service_reports;
		result.user_field_service_reports = await backupOperations.getUserFieldServiceReports(user.id);
		result.metadata.user_field_service_reports = localDate;
	}

	if (user.metadata.delegated_field_service_reports !== metadata.delegated_field_service_reports) {
		const localDate = user.metadata.delegated_field_service_reports;
		result.delegated_field_service_reports =
			await backupOperations.getUserDelegatedFieldServiceReports(user.id);
		result.metadata.delegated_field_service_reports = localDate;
	}

	if (!result.cong_field_service_reports && user.profile.congregation!.user_local_uid) {
		if (congregation.metadata.cong_field_service_reports !== metadata.cong_field_service_reports) {
			const localDate = congregation.metadata.cong_field_service_reports;
			const reports = await backupOperations.getFieldServiceReports(congregation.id);

			const congUserReports = reports.filter((record) => {
				const data = record.report_data as StandardRecord;

				return miniPersons.includes(String(data.person_uid));
			});

			result.cong_field_service_reports = congUserReports;
			result.metadata.cong_field_service_reports = localDate;
		}
	}
};

const addMinimalPersonsAndPublicSchedules = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, miniPersons, capabilities } = context;
	const { personMinimal } = capabilities;

	if (!personMinimal) return;

	if (congregation.metadata.persons !== metadata.persons) {
		const localDate = congregation.metadata.persons;
		const persons = await backupOperations.getCongregationPersons(congregation.id);

		const minimalPersons = persons.map((record) => {
			const includeTimeAway = congregation.settings.time_away_public?.value;

			const personData = record.person_data as StandardRecord;

			return {
				_deleted: record._deleted,
				person_uid: record.person_uid,
				person_data: {
					person_firstname: personData.person_firstname,
					person_lastname: personData.person_lastname,
					person_display_name: personData.person_display_name,
					male: personData.male,
					female: personData.female,
					publisher_unbaptized: personData.publisher_unbaptized,
					publisher_baptized: personData.publisher_baptized,
					midweek_meeting_student: personData.midweek_meeting_student,
					privileges: personData.privileges,
					enrollments: personData.enrollments,
					emergency_contacts: miniPersons.includes(String(record.person_uid)) ? personData.emergency_contacts : undefined,
					assignments: miniPersons.includes(String(record.person_uid)) ? personData.assignments : undefined,
					timeAway: includeTimeAway || miniPersons.includes(String(record.person_uid)) ? personData.timeAway : undefined,
				},
			};
		});

		result.persons = minimalPersons;
		result.metadata.persons = localDate;
	}

	if (congregation.metadata.public_sources !== metadata.public_sources) {
		const localDate = congregation.metadata.public_sources;
		result.public_sources = await backupOperations.getPublicSources(congregation.id);
		result.metadata.public_sources = localDate;
	}

	if (congregation.metadata.public_schedules !== metadata.public_schedules) {
		const localDate = congregation.metadata.public_schedules;
		result.public_schedules = await backupOperations.getPublicSchedules(congregation.id);
		result.metadata.public_schedules = localDate;
	}
};

const addPrivateSchedules = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, capabilities } = context;
	const { elderRole, scheduleEditor } = capabilities;

	if (!scheduleEditor && !elderRole) return;

	if (congregation.metadata.sources !== metadata.sources) {
		const localDate = congregation.metadata.sources;
		result.sources = await backupOperations.getSources(congregation.id);
		result.metadata.sources = localDate;
	}

	if (congregation.metadata.schedules !== metadata.schedules) {
		const localDate = congregation.metadata.schedules;
		result.sched = await backupOperations.getSchedules(congregation.id);
		result.metadata.schedules = localDate;
	}
};

const addAttendance = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, capabilities } = context;
	const { attendanceTracker } = capabilities;

	if (!attendanceTracker) return;

	if (congregation.metadata.meeting_attendance !== metadata.meeting_attendance) {
		const localDate = congregation.metadata.meeting_attendance;
		result.meeting_attendance = await backupOperations.getMeetingAttendance(congregation.id);
		result.metadata.meeting_attendance = localDate;
	}
};

const addIncomingReports = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, capabilities } = context;
	const { secretaryRole } = capabilities;

	if (!secretaryRole) return;

	if (congregation.metadata.incoming_reports !== metadata.incoming_reports) {
		const localDate = congregation.metadata.incoming_reports;
		result.incoming_reports = congregation.incoming_reports;
		result.metadata.incoming_reports = localDate;
	}
};

const addAdministrationData = async (context: UserBackupContext): Promise<void> => {
	const { congregation, metadata, result, backupOperations, capabilities } = context;
	const { adminRole } = capabilities;

	if (!adminRole) return;

	if (congregation.metadata.branch_cong_analysis !== metadata.branch_cong_analysis) {
		const localDate = congregation.metadata.branch_cong_analysis;
		result.branch_cong_analysis = await backupOperations.getBranchCongAnalysis(congregation.id);
		result.metadata.branch_cong_analysis = localDate;
	}

	if (congregation.metadata.branch_field_service_reports !== metadata.branch_field_service_reports) {
		const localDate = congregation.metadata.branch_field_service_reports;
		result.branch_field_service_reports = await backupOperations.getBranchFieldServiceReports(congregation.id);
		result.metadata.branch_field_service_reports = localDate;
	}

	result.cong_users = congregation.members.map((member) => {
		return {
			id: member.id,
			local_uid: member.profile.congregation?.user_local_uid,
			role: member.profile.congregation?.cong_role,
		};
	});
};

const addUnsynchronizedSettings = async (context: UserBackupContext): Promise<void> => {
	const { user, congregation, metadata, result, masterKeyNeed } = context;

	result.app_settings = {};
	result.metadata = {};

	const localUserDate = user.metadata.user_settings;
	const incomingUserDate = metadata.user_settings;

	if (localUserDate !== incomingUserDate) {
		result.app_settings.user_settings = {
			cong_role: user.profile.congregation?.cong_role,
			firstname: user.profile.firstname,
			lastname: user.profile.lastname,
			user_local_uid: user.profile.congregation?.user_local_uid,
			user_members_delegate: user.profile.congregation?.user_members_delegate,
		};

		result.metadata.user_settings = localUserDate;
	}

	result.app_settings.cong_settings = {
		cong_access_code: congregation.settings.cong_access_code,
		cong_master_key: masterKeyNeed ? congregation.settings.cong_master_key : undefined,
		data_sync: congregation.settings.data_sync,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		country_code: congregation.settings.country_code,
	} as CongSettingsType;

	const localCongDate = congregation.metadata.cong_settings;
	const incomingCongDate = metadata.cong_settings;

	if (incomingCongDate !== localCongDate) {
		const midweek = congregation.settings.midweek_meeting.map((record) => {
			return { type: record.type, time: record.time, weekday: record.weekday, _deleted: record._deleted };
		});

		const weekend = congregation.settings.weekend_meeting.map((record) => {
			return { type: record.type, time: record.time, weekday: record.weekday, _deleted: record._deleted };
		});

		result.app_settings.cong_settings.cong_circuit = congregation.settings.cong_circuit;
		result.app_settings.cong_settings.cong_discoverable = congregation.settings.cong_discoverable;
		result.app_settings.cong_settings.cong_location = congregation.settings.cong_location;
		result.app_settings.cong_settings.time_away_public = congregation.settings.time_away_public;
		result.app_settings.cong_settings.midweek_meeting = midweek;
		result.app_settings.cong_settings.weekend_meeting = weekend;

		result.metadata.cong_settings = localCongDate;
	}
};

export const retrieveUserBackup = async (
	userId: string,
	metadataHeader: string,
	operations: Partial<UserBackupRetrievalOperations> = {},
): Promise<BackupData> => {
	const backupOperations = { ...defaultBackupRetrievalOperations, ...operations };
	const { user, congregation } = getUserBackupContext(userId);
	const metadata = parseUserBackupMetadata(metadataHeader);

	const result = {} as BackupData;

	const userRole = user.profile.congregation!.cong_role;

	const masterKeyNeed = canAccessCongregationMasterKey(userRole);

	const capabilities = getUserCapabilities(userRole);

	const userUid = user.profile.congregation!.user_local_uid;
	const delegates = user.profile.congregation!.user_members_delegate;

	const miniPersons = delegates ? structuredClone(delegates) : [];

	if (userUid && userUid?.length > 0) {
		miniPersons.push(userUid);
	}

	const context: UserBackupContext = { user, congregation, metadata, result, backupOperations, miniPersons, masterKeyNeed, capabilities };

	if (congregation.settings.data_sync.value) {
		await addSynchronizedSettingsAndGroups(context);
		await addFullPersons(context);
		await addSpeakerDirectories(context);
		await addCongregationReports(context);
		await addPublicTalkDetails(context);
		await addPublisherReports(context);
		await addMinimalPersonsAndPublicSchedules(context);
		await addPrivateSchedules(context);
		await addAttendance(context);
		await addIncomingReports(context);
		await addAdministrationData(context);
	}

	if (!congregation.settings.data_sync.value) {
		await addUnsynchronizedSettings(context);
	}

	return result;
};
