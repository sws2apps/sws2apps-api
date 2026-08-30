import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { getUserCapabilities } from '../../domain/users/user-capabilities.js';
import type { StandardRecord } from '../../types/standard-record.js';
import { BackupData } from '../backups/backup.types.js';
import type { Congregation } from '../congregations/congregation.js';
import { CongregationsList } from '../congregations/congregations.js';
import type { CongSettingsType } from '../congregations/congregations.types.js';
import type { User } from './user.js';
import { UsersList } from './users.js';

export type UserBackupErrorCode = 'CONGREGATION_NOT_ASSIGNED' | 'CONGREGATION_NOT_FOUND';

export class UserBackupError extends Error {
	constructor(public readonly code: UserBackupErrorCode) {
		super(code);
		this.name = 'UserBackupError';
	}
}

export const getUserBackupContext = (userId: string): {
	user: User;
	congregation: Congregation;
} => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	if (!congregationId) throw new UserBackupError('CONGREGATION_NOT_ASSIGNED');

	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) throw new UserBackupError('CONGREGATION_NOT_FOUND');

	return { user, congregation };
};

export const retrieveUserBackup = async (
	userId: string,
	metadataHeader: string,
): Promise<BackupData> => {
	const { user, congregation } = getUserBackupContext(userId);
	const metadata = JSON.parse(metadataHeader) as Record<string, string>;

	const result = {} as BackupData;

	const userRole = user.profile.congregation!.cong_role;

	const masterKeyNeed = canAccessCongregationMasterKey(userRole);

	const {
		personViewer,
		elderRole,
		reportEditorRole,
		publicTalkEditor,
		isPublisher,
		adminRole,
		personMinimal,
		scheduleEditor,
		attendanceTracker,
		secretaryRole,
	} = getUserCapabilities(userRole);

	const userUid = user.profile.congregation!.user_local_uid;
	const delegates = user.profile.congregation!.user_members_delegate;

	const miniPersons = delegates ? structuredClone(delegates) : [];

	if (userUid && userUid?.length > 0) {
		miniPersons.push(userUid);
	}

	if (congregation.settings.data_sync.value) {
		result.app_settings = {};
		result.metadata = {};

		let localDate = user.metadata.user_settings;
		let incomingDate = metadata.user_settings;

		if (localDate !== incomingDate) {
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

		localDate = congregation.metadata.cong_settings;
		incomingDate = metadata.cong_settings;

		if (localDate !== incomingDate) {
			result.app_settings.cong_settings = structuredClone(congregation.settings);

			if (!masterKeyNeed) {
				result.app_settings.cong_settings.cong_master_key = undefined;
			}

			result.metadata.cong_settings = localDate;
		}

		localDate = congregation.metadata.field_service_groups;
		incomingDate = metadata.field_service_groups;

		if (localDate !== incomingDate) {
			result.field_service_groups = await congregation.getFieldServiceGroups();
			result.metadata.field_service_groups = localDate;
		}

		localDate = congregation.metadata.upcoming_events;
		incomingDate = metadata.upcoming_events;

		if (localDate !== incomingDate) {
			result.upcoming_events = await congregation.getUpcomingEvents();
			result.metadata.upcoming_events = localDate;
		}

		if (personViewer) {
			localDate = congregation.metadata.persons;
			incomingDate = metadata.persons;

			if (localDate !== incomingDate) {
				result.persons = await congregation.getPersons();
				result.metadata.persons = localDate;
			}
		}

		if (elderRole) {
			localDate = congregation.metadata.speakers_congregations;
			incomingDate = metadata.speakers_congregations;

			if (localDate !== incomingDate) {
				result.speakers_congregations = await congregation.getSpeakersCongregations();
				result.metadata.speakers_congregations = localDate;
			}

			localDate = congregation.metadata.visiting_speakers;
			incomingDate = metadata.visiting_speakers;

			if (localDate !== incomingDate) {
				result.visiting_speakers = await congregation.getVisitingSpeakers();
				result.metadata.visiting_speakers = localDate;
			}
		}

		if (reportEditorRole) {
			localDate = congregation.metadata.cong_field_service_reports;
			incomingDate = metadata.cong_field_service_reports;

			if (localDate !== incomingDate) {
				result.cong_field_service_reports = await congregation.getFieldServiceReports();
				result.metadata.cong_field_service_reports = localDate;
			}
		}

		if (publicTalkEditor) {
			result.speakers_key = congregation.outgoing_speakers.speakers_key;
			result.outgoing_talks = await congregation.getPublicIncomingTalks();
		}

		if (adminRole || isPublisher) {
			localDate = user.metadata.user_bible_studies;
			incomingDate = metadata.user_bible_studies;

			if (localDate !== incomingDate) {
				result.user_bible_studies = await user.getBibleStudies();
				result.metadata.user_bible_studies = localDate;
			}

			localDate = user.metadata.user_field_service_reports;
			incomingDate = metadata.user_field_service_reports;

			if (localDate !== incomingDate) {
				result.user_field_service_reports = await user.getFieldServiceReports();
				result.metadata.user_field_service_reports = localDate;
			}

			localDate = user.metadata.delegated_field_service_reports;
			incomingDate = metadata.delegated_field_service_reports;

			if (localDate !== incomingDate) {
				result.delegated_field_service_reports = await user.getDelegatedFieldServiceReports();
				result.metadata.delegated_field_service_reports = localDate;
			}

			if (!result.cong_field_service_reports && user.profile.congregation!.user_local_uid) {
				localDate = congregation.metadata.cong_field_service_reports;
				incomingDate = metadata.cong_field_service_reports;

				if (localDate !== incomingDate) {
					const reports = await congregation.getFieldServiceReports();

					const congUserReports = reports.filter((record) => {
						const data = record.report_data as StandardRecord;

						return miniPersons.includes(String(data.person_uid));
					});

					result.cong_field_service_reports = congUserReports;
					result.metadata.cong_field_service_reports = localDate;
				}
			}
		}

		if (personMinimal) {
			localDate = congregation.metadata.persons;
			incomingDate = metadata.persons;

			if (localDate !== incomingDate) {
				const persons = await congregation.getPersons();

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

			localDate = congregation.metadata.public_sources;
			incomingDate = metadata.public_sources;

			if (localDate !== incomingDate) {
				result.public_sources = await congregation.getPublicSources();
				result.metadata.public_sources = localDate;
			}

			localDate = congregation.metadata.public_schedules;
			incomingDate = metadata.public_schedules;

			if (localDate !== incomingDate) {
				result.public_schedules = await congregation.getPublicSchedules();
				result.metadata.public_schedules = localDate;
			}
		}

		if (scheduleEditor || elderRole) {
			localDate = congregation.metadata.sources;
			incomingDate = metadata.sources;

			if (localDate !== incomingDate) {
				result.sources = await congregation.getSources();
				result.metadata.sources = localDate;
			}

			localDate = congregation.metadata.schedules;
			incomingDate = metadata.schedules;

			if (localDate !== incomingDate) {
				result.sched = await congregation.getSchedules();
				result.metadata.schedules = localDate;
			}
		}

		if (attendanceTracker) {
			localDate = congregation.metadata.meeting_attendance;
			incomingDate = metadata.meeting_attendance;

			if (localDate !== incomingDate) {
				result.meeting_attendance = await congregation.getMeetingAttendance();
				result.metadata.meeting_attendance = localDate;
			}
		}

		if (secretaryRole) {
			localDate = congregation.metadata.incoming_reports;
			incomingDate = metadata.incoming_reports;

			if (localDate !== incomingDate) {
				result.incoming_reports = congregation.incoming_reports;
				result.metadata.incoming_reports = localDate;
			}
		}

		if (adminRole) {
			localDate = congregation.metadata.branch_cong_analysis;
			incomingDate = metadata.branch_cong_analysis;

			if (localDate !== incomingDate) {
				result.branch_cong_analysis = await congregation.getBranchCongAnalysis();
				result.metadata.branch_cong_analysis = localDate;
			}

			localDate = congregation.metadata.branch_field_service_reports;
			incomingDate = metadata.branch_field_service_reports;

			if (localDate !== incomingDate) {
				result.branch_field_service_reports = await congregation.getBranchFieldServiceReports();
				result.metadata.branch_field_service_reports = localDate;
			}

			result.cong_users = congregation.members.map((member) => {
				return {
					id: member.id,
					local_uid: member.profile.congregation?.user_local_uid,
					role: member.profile.congregation?.cong_role,
				};
			});
		}
	}

	if (!congregation.settings.data_sync.value) {
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
	}

	return result;
};
