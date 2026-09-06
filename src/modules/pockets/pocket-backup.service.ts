import {
	type BackupData,
	BackupMetadataError,
	findBackupMetadataConflict,
	parseBackupMetadata,
	savePocketBackupAsync,
} from '#modules/backups/index.js';
import {
	CongregationsList,
	isCongregationMember,
	type CongSettingsType,
	getCongregationPersons,
	getFieldServiceGroups,
	getFieldServiceReports,
	getPublicSchedules,
	getPublicSources,
	getUpcomingEvents,
} from '#modules/congregations/index.js';
import {
	UsersList,
	getUserStoredBibleStudies,
	getUserStoredDelegatedFieldServiceReports,
	getUserStoredFieldServiceReports,
} from '#modules/users/index.js';
import type { StandardRecord } from '../../types/standard-record.js';

export type PocketBackupErrorCode =
	| 'USER_NOT_FOUND'
	| 'INVALID_METADATA'
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'BACKUP_OUTDATED'
	| 'PERSISTENCE_FAILED';

export class PocketBackupError extends Error {
	constructor(public readonly code: PocketBackupErrorCode) {
		super(code);
		this.name = 'PocketBackupError';
	}
}

export const parsePocketBackupMetadata = (metadataHeader: string): Record<string, string> => {
	try {
		return parseBackupMetadata(metadataHeader);
	} catch (error) {
		if (!(error instanceof BackupMetadataError)) throw error;
		throw new PocketBackupError('INVALID_METADATA');
	}
};

export const getPocketBackupContext = (userId: string, metadataHeader: string) => {
	const user = UsersList.findById(userId);
	if (!user) throw new PocketBackupError('USER_NOT_FOUND');

	const membership = user.profile.congregation;
	const congregationId = membership?.id;
	const congregation = congregationId ? CongregationsList.findById(congregationId) : undefined;

	if (!membership || !congregation) {
		throw new PocketBackupError('CONGREGATION_NOT_FOUND');
	}
	if (!isCongregationMember(congregation, user.id)) throw new PocketBackupError('MEMBERSHIP_REQUIRED');

	return {
		user,
		congregation,
		membership,
		metadata: parsePocketBackupMetadata(metadataHeader),
	};
};

type PocketBackupContext = ReturnType<typeof getPocketBackupContext>;
type PocketUser = PocketBackupContext['user'];
type PocketCongregation = PocketBackupContext['congregation'];

export const retrievePocketBackup = async (
	userId: string,
	metadataHeader: string,
): Promise<BackupData> => {
	const { user, congregation, membership, metadata } = getPocketBackupContext(
		userId,
		metadataHeader,
	);
	const backup = {} as BackupData;
	const localUserId = membership.user_local_uid;
	const delegatedUserIds = membership.user_members_delegate;
	const visiblePersonIds = delegatedUserIds ? structuredClone(delegatedUserIds) : [];

	if (localUserId && localUserId.length > 0) visiblePersonIds.push(localUserId);

	backup.app_settings = {};
	backup.metadata = {};

	addPocketSettingsChanges(backup, user, congregation, metadata);

	if (congregation.settings.data_sync.value) {
		await addPrivateBackupChanges(
			backup,
			user,
			congregation,
			metadata,
			visiblePersonIds,
			membership.cong_role,
		);
	}

	await addPublicBackupChanges(backup, congregation, metadata);

	return backup;
};

const getPocketUserSettings = (user: PocketUser, congregation: PocketCongregation) => {
	return {
		cong_role: user.profile.congregation?.cong_role,
		firstname: user.profile.firstname,
		lastname: user.profile.lastname,
		user_local_uid: user.profile.congregation?.user_local_uid,
		user_members_delegate: user.profile.congregation?.user_members_delegate,
		backup_automatic:
			congregation.settings.data_sync.value && user.settings.backup_automatic?.length > 0
				? user.settings.backup_automatic
				: undefined,
		theme_follow_os_enabled:
			congregation.settings.data_sync.value && user.settings.theme_follow_os_enabled?.length > 0
				? user.settings.theme_follow_os_enabled
				: undefined,
		hour_credits_enabled:
			congregation.settings.data_sync.value && user.settings.hour_credits_enabled?.length > 0
				? user.settings.hour_credits_enabled
				: undefined,
		data_view:
			congregation.settings.data_sync.value && user.settings.data_view?.length > 0
				? user.settings.data_view
				: undefined,
	};
};

const addPocketSettingsChanges = (
	backup: BackupData,
	user: PocketUser,
	congregation: PocketCongregation,
	metadata: Record<string, string>,
): void => {
	const localUserSettingsDate = user.metadata.user_settings;
	if (localUserSettingsDate !== metadata.user_settings) {
		backup.app_settings.user_settings = getPocketUserSettings(user, congregation);

		backup.metadata.user_settings = localUserSettingsDate;
	}

	backup.app_settings.cong_settings = {
		cong_access_code: congregation.settings.cong_access_code,
		data_sync: congregation.settings.data_sync,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		country_code: congregation.settings.country_code,
	} as CongSettingsType;

	const localCongregationSettingsDate = congregation.metadata.cong_settings;
	if (localCongregationSettingsDate !== metadata.cong_settings) {
		if (congregation.settings.data_sync.value) {
			backup.app_settings.cong_settings = structuredClone(congregation.settings);
			backup.app_settings.cong_settings.cong_master_key = undefined;
		} else {
			const midweekMeeting = congregation.settings.midweek_meeting.map(({ type, time, weekday, _deleted }) => ({
				type,
				time,
				weekday,
				_deleted,
			}));
			const weekendMeeting = congregation.settings.weekend_meeting.map(({ type, time, weekday, _deleted }) => ({
				type,
				time,
				weekday,
				_deleted,
			}));

			Object.assign(backup.app_settings.cong_settings, {
				cong_circuit: congregation.settings.cong_circuit,
				cong_discoverable: congregation.settings.cong_discoverable,
				cong_location: congregation.settings.cong_location,
				time_away_public: congregation.settings.time_away_public,
				midweek_meeting: midweekMeeting,
				weekend_meeting: weekendMeeting,
			});
		}

		backup.metadata.cong_settings = localCongregationSettingsDate;
	}
};

const addPrivateBackupChanges = async (
	backup: BackupData,
	user: PocketUser,
	congregation: PocketCongregation,
	metadata: Record<string, string>,
	visiblePersonIds: string[],
	userRoles: PocketBackupContext['membership']['cong_role'],
) => {
	if (congregation.metadata.persons !== metadata.persons) {
		const persons = await getCongregationPersons(congregation.id);
		const includeTimeAway = congregation.settings.time_away_public?.value;

		backup.persons = persons.map((record) => {
			const person = record.person_data as StandardRecord;
			const canViewPrivateDetails = visiblePersonIds.includes(String(record.person_uid));

			return {
				_deleted: record._deleted,
				person_uid: record.person_uid,
				person_data: {
					person_firstname: person.person_firstname,
					person_lastname: person.person_lastname,
					person_display_name: person.person_display_name,
					male: person.male,
					female: person.female,
					publisher_unbaptized: person.publisher_unbaptized,
					publisher_baptized: person.publisher_baptized,
					midweek_meeting_student: person.midweek_meeting_student,
					privileges: person.privileges,
					enrollments: person.enrollments,
					emergency_contacts: canViewPrivateDetails ? person.emergency_contacts : undefined,
					assignments: canViewPrivateDetails ? person.assignments : undefined,
					timeAway: includeTimeAway || canViewPrivateDetails ? person.timeAway : undefined,
				},
			};
		});
		backup.metadata.persons = congregation.metadata.persons;
	}

	if (congregation.metadata.field_service_groups !== metadata.field_service_groups) {
		backup.field_service_groups = await getFieldServiceGroups(congregation.id);
		backup.metadata.field_service_groups = congregation.metadata.field_service_groups;
	}

	if (congregation.metadata.upcoming_events !== metadata.upcoming_events) {
		backup.upcoming_events = await getUpcomingEvents(congregation.id);
		backup.metadata.upcoming_events = congregation.metadata.upcoming_events;
	}

	if (!userRoles.includes('publisher')) return;

	if (user.metadata.user_bible_studies !== metadata.user_bible_studies) {
		backup.user_bible_studies = await getUserStoredBibleStudies(user.id);
		backup.metadata.user_bible_studies = user.metadata.user_bible_studies;
	}

	if (user.metadata.user_field_service_reports !== metadata.user_field_service_reports) {
		backup.user_field_service_reports = await getUserStoredFieldServiceReports(user.id);
		backup.metadata.user_field_service_reports = user.metadata.user_field_service_reports;
	}

	if (user.metadata.delegated_field_service_reports !== metadata.delegated_field_service_reports) {
		backup.delegated_field_service_reports =
			await getUserStoredDelegatedFieldServiceReports(user.id);
		backup.metadata.delegated_field_service_reports = user.metadata.delegated_field_service_reports;
	}

	if (
		congregation.metadata.cong_field_service_reports !== metadata.cong_field_service_reports &&
		user.profile.congregation?.user_local_uid
	) {
		const reports = await getFieldServiceReports(congregation.id);
		backup.cong_field_service_reports = reports.filter((record) => {
			const report = record.report_data as StandardRecord;
			return visiblePersonIds.includes(String(report.person_uid));
		});
		backup.metadata.cong_field_service_reports = congregation.metadata.cong_field_service_reports;
	}
};

const addPublicBackupChanges = async (
	backup: BackupData,
	congregation: PocketCongregation,
	metadata: Record<string, string>,
) => {
	if (congregation.metadata.public_sources !== metadata.public_sources) {
		backup.public_sources = await getPublicSources(congregation.id);
		backup.metadata.public_sources = congregation.metadata.public_sources;
	}

	if (congregation.metadata.public_schedules !== metadata.public_schedules) {
		backup.public_schedules = await getPublicSchedules(congregation.id);
		backup.metadata.public_schedules = congregation.metadata.public_schedules;
	}
};

export type PocketBackupSubmissionOperations = {
	saveBackup: typeof savePocketBackupAsync;
};

const defaultPocketBackupSubmissionOperations: PocketBackupSubmissionOperations = {
	saveBackup: (input) => savePocketBackupAsync(input),
};

export const submitPocketBackup = async (
	userId: string,
	metadataHeader: string,
	congregationBackup: BackupData,
	operations: Partial<PocketBackupSubmissionOperations> = {},
): Promise<void> => {
	const submission = { ...defaultPocketBackupSubmissionOperations, ...operations };
	const {
		user,
		congregation,
		membership,
		metadata: incomingMetadata,
	} = getPocketBackupContext(userId, metadataHeader);
	const currentMetadata = { ...congregation.metadata, ...user.metadata };

	if (findBackupMetadataConflict(currentMetadata, incomingMetadata)) {
		throw new PocketBackupError('BACKUP_OUTDATED');
	}

	const outcome = await submission.saveBackup({
		userId: user.id,
		userRole: membership.cong_role,
		cong_backup: congregationBackup,
	});

	if (outcome.status === 'failed') {
		throw new PocketBackupError('PERSISTENCE_FAILED');
	}
};
