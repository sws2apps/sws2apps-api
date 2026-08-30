import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { formatError } from '../../http/validation-errors.js';
import { getSessionCookieOptions } from '../../http/security/session-cookie-options.js';
import { BackupData } from '../backups/backup.types.js';
import { CongSettingsType } from '../congregations/congregations.types.js';
import type { StandardRecord } from '../../types/standard-record.js';
import {
	authenticatePocketInvitation,
	PocketAuthenticationError,
	validatePocketSession,
} from './pocket-authentication.service.js';
import {
	deletePocketAccount,
	getPocketApplications,
	getPocketUserSessions,
	PocketUserError,
	revokePocketUserSession,
	submitPocketApplication,
	submitPocketReport,
} from './pocket-user.service.js';
import {
	getPocketBackupContext,
	PocketBackupError,
	submitPocketBackup,
} from './pocket-backup.service.js';

const handlePocketBackupError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof PocketBackupError)) return false;

	res.locals.type = error.code === 'BACKUP_OUTDATED' ? 'info' : 'warn';

	if (error.code === 'INVALID_METADATA') {
		res.locals.message = 'invalid backup metadata';
		res.status(400).json({ message: 'error_api_bad-request' });
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'user not associated to any congregation';
		res.clearCookie('visitorid');
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	if (error.code === 'MEMBERSHIP_REQUIRED') {
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return true;
	}

	res.locals.message = 'user backup outdated';
	res.status(400).json({ message: 'BACKUP_OUTDATED' });
	return true;
};

export const validateInvitation = async (req: Request, res: Response) => {
	// validate through express middleware
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	try {
		const authentication = await authenticatePocketInvitation({
			invitationCode: req.body.code as string,
			visitorId: req.signedCookies.visitorid,
			visitorIp: req.clientIp!,
			headers: req.headers,
		});

		res.locals.type = 'info';
		res.locals.message = 'pocket user successfully logged in';
		res.cookie('visitorid', authentication.visitorId, getSessionCookieOptions(req));
		res.status(200).json(authentication.userInfo);
	} catch (error) {
		if (!(error instanceof PocketAuthenticationError) || error.code !== 'INVALID_INVITATION') throw error;

		res.locals.type = 'warn';
		res.locals.message = 'the code received is invalid';
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
	}
};

export const validatePocket = async (req: Request, res: Response) => {
	try {
		const userInfo = validatePocketSession(res.locals.currentUser.id);

		res.locals.type = 'info';
		res.locals.message = 'pocket user successfully logged in';
		res.status(200).json(userInfo);
	} catch (error) {
		if (!(error instanceof PocketAuthenticationError) || error.code !== 'CONGREGATION_NOT_FOUND') throw error;

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided code';
		res.clearCookie('visitorid');
		res.status(404).json({ message: 'error_app_congregation_not-found' });
	}
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	let backupContext: ReturnType<typeof getPocketBackupContext>;

	try {
		backupContext = getPocketBackupContext(
			res.locals.currentUser.id,
			req.headers.metadata!.toString(),
		);
	} catch (error) {
		if (!handlePocketBackupError(error, res)) throw error;
		return;
	}

	const { user, congregation: cong, metadata } = backupContext;

	const result = {} as BackupData;

	const userUid = user.profile.congregation!.user_local_uid;
	const delegates = user.profile.congregation!.user_members_delegate;

	const miniPersons = delegates ? structuredClone(delegates) : [];

	if (userUid && userUid?.length > 0) {
		miniPersons.push(userUid);
	}

	if (cong.settings.data_sync.value) {
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
			cong_access_code: cong.settings.cong_access_code,
			data_sync: cong.settings.data_sync,
			cong_name: cong.settings.cong_name,
			cong_prefix: cong.settings.cong_prefix,
			cong_number: cong.settings.cong_number,
			country_code: cong.settings.country_code,
		} as CongSettingsType;

		localDate = cong.metadata.cong_settings;
		incomingDate = metadata.cong_settings;

		if (localDate !== incomingDate) {
			result.app_settings.cong_settings = structuredClone(cong.settings);
			result.app_settings.cong_settings.cong_master_key = undefined;

			result.metadata.cong_settings = localDate;
		}

		localDate = cong.metadata.persons;
		incomingDate = metadata.persons;

		const isPublisher = user.profile.congregation!.cong_role.includes('publisher');

		if (localDate !== incomingDate) {
			const persons = await cong.getPersons();

			const minimalPersons = persons.map((record) => {
				const includeTimeAway = cong.settings.time_away_public?.value;

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

		localDate = cong.metadata.field_service_groups;
		incomingDate = metadata.field_service_groups;

		if (localDate !== incomingDate) {
			result.field_service_groups = await cong.getFieldServiceGroups();
			result.metadata.field_service_groups = localDate;
		}

		localDate = cong.metadata.upcoming_events;
		incomingDate = metadata.upcoming_events;

		if (localDate !== incomingDate) {
			result.upcoming_events = await cong.getUpcomingEvents();
			result.metadata.upcoming_events = localDate;
		}

		if (isPublisher) {
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

			localDate = cong.metadata.cong_field_service_reports;
			incomingDate = metadata.cong_field_service_reports;

			if (localDate !== incomingDate) {
				if (user.profile.congregation?.user_local_uid) {
					const reports = await cong.getFieldServiceReports();

					const congUserReports = reports.filter((record) => {
						const data = record.report_data as StandardRecord;

						return miniPersons.includes(String(data.person_uid));
					});

					result.cong_field_service_reports = congUserReports;
					result.metadata.cong_field_service_reports = localDate;
				}
			}
		}
	}

	if (!cong.settings.data_sync.value) {
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
			cong_access_code: cong.settings.cong_access_code,
			data_sync: cong.settings.data_sync,
			cong_name: cong.settings.cong_name,
			cong_prefix: cong.settings.cong_prefix,
			cong_number: cong.settings.cong_number,
			country_code: cong.settings.country_code,
		} as CongSettingsType;

		const localCongDate = cong.metadata.cong_settings;
		const incomingCongDate = metadata.cong_settings;

		if (incomingCongDate !== localCongDate) {
			const midweek = cong.settings.midweek_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday, _deleted: record._deleted };
			});

			const weekend = cong.settings.weekend_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday, _deleted: record._deleted };
			});

			result.app_settings.cong_settings.cong_circuit = cong.settings.cong_circuit;
			result.app_settings.cong_settings.cong_discoverable = cong.settings.cong_discoverable;
			result.app_settings.cong_settings.cong_location = cong.settings.cong_location;
			result.app_settings.cong_settings.time_away_public = cong.settings.time_away_public;
			result.app_settings.cong_settings.midweek_meeting = midweek;
			result.app_settings.cong_settings.weekend_meeting = weekend;

			result.metadata.cong_settings = localCongDate;
		}
	}

	let localDate = cong.metadata.public_sources;
	let incomingDate = metadata.public_sources;

	if (localDate !== incomingDate) {
		result.public_sources = await cong.getPublicSources();
		result.metadata.public_sources = localDate;
	}

	localDate = cong.metadata.public_schedules;
	incomingDate = metadata.public_schedules;

	if (localDate !== incomingDate) {
		result.public_schedules = await cong.getPublicSchedules();
		result.metadata.public_schedules = localDate;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve backup successfully';
	res.status(200).json(result);
};

export const saveUserBackup = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	try {
		submitPocketBackup(
			res.locals.currentUser.id,
			req.headers.metadata!.toString(),
			req.body.cong_backup as BackupData,
		);
	} catch (error) {
		if (!handlePocketBackupError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user send backup successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getPocketSessions = async (req: Request, res: Response) => {
	const sessions = getPocketUserSessions(res.locals.currentUser.id, req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = `user has fetched sessions successfully`;
	res.status(200).json(sessions);
};

export const deletePocketSession = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const identifier = req.body.identifier as string;

	const sessions = await revokePocketUserSession(res.locals.currentUser.id, identifier);

	res.locals.type = 'info';
	res.locals.message = `user has revoked session successfully`;
	res.status(200).json(sessions);
};

export const postPocketReport = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	try {
		submitPocketReport(res.locals.currentUser.id, req.body.report as StandardRecord);
	} catch (error) {
		if (!(error instanceof PocketUserError)) throw error;

		res.locals.type = 'warn';

		if (error.code === 'CONGREGATION_NOT_FOUND') {
			res.locals.message = 'user not associated to any congregation';
			res.clearCookie('visitorid');
			res.status(404).json({ message: 'error_app_congregation_not-found' });
			return;
		}

		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user sent report successfully`;
	res.status(200).json({ message: 'REPORT_SENT' });
};

export const getPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	const results = getPocketApplications(res.locals.currentUser.id);

	res.locals.type = 'info';
	res.locals.message = `user get submitted auxiliary pioneer application list`;
	res.status(200).json(results);
};

export const submitPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	submitPocketApplication(res.locals.currentUser.id, req.body.application as StandardRecord);

	res.locals.type = 'info';
	res.locals.message = `user submitted auxiliary pioneer application`;
	res.status(200).json({ message: 'APPLICATION_SENT' });
};

export const deletePocketUser = async (req: Request, res: Response) => {
	await deletePocketAccount(res.locals.currentUser.id);

	res.locals.type = 'info';
	res.locals.message = 'user deleted account successfully';
	res.status(200).json({ message: 'ACCOUNT_DELETED' });
};
